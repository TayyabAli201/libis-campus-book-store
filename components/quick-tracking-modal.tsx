"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Truck,
  MessageCircle,
  CheckCircle2,
  Check,
  Search,
  X,
  ExternalLink,
  Package,
  Save,
  AlertCircle,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import {
  isOtherCityOrder,
  formatWhatsAppPhone,
  money,
} from "../lib/contracts";
import { api, errorText } from "./shared";

interface QuickTrackingModalProps {
  orders: any[];
  onClose: () => void;
  onSaved: () => void;
  isAdmin?: boolean;
  isVendor?: boolean;
}

interface OrderRowState {
  courierName: string;
  trackingId: string;
  actualCharges: string;
  saving: boolean;
  saved: boolean;
  messaged: boolean;
  error?: string;
}

const POPULAR_COURIERS = [
  "Pakistan Post",
  "TCS",
  "Leopards",
  "Trax",
  "Call Courier",
  "M&P",
  "PostEx",
];

export function QuickTrackingModal({
  orders,
  onClose,
  onSaved,
  isAdmin = true,
  isVendor = false,
}: QuickTrackingModalProps) {
  const [mounted, setMounted] = useState(false);
  const [filterMode, setFilterMode] = useState<"missing" | "all">("missing");
  const [searchQuery, setSearchQuery] = useState("");
  const [defaultCourier, setDefaultCourier] = useState("Pakistan Post");
  const [batchSaving, setBatchSaving] = useState(false);
  const inputRefs = useRef<{ [orderId: string]: HTMLInputElement | null }>({});

  useEffect(() => {
    setMounted(true);
    document.body.classList.add("quick-tracking-modal-open");
    return () => {
      document.body.classList.remove("quick-tracking-modal-open");
    };
  }, []);

  // Filter strictly to Other City courier orders
  const otherCityOrders = (orders || []).filter(isOtherCityOrder);

  // Initialize state for each order
  const [rowStates, setRowStates] = useState<{ [orderId: string]: OrderRowState }>(() => {
    const initial: { [orderId: string]: OrderRowState } = {};
    otherCityOrders.forEach((o) => {
      initial[o.id] = {
        courierName: o.courier_name || "Pakistan Post",
        trackingId: o.courier_tracking_id || "",
        actualCharges:
          o.actual_courier_charges !== undefined &&
          o.actual_courier_charges !== null &&
          Number(o.actual_courier_charges) > 0
            ? String(o.actual_courier_charges)
            : "",
        saving: false,
        saved: Boolean(o.courier_tracking_id),
        messaged: false,
      };
    });
    return initial;
  });

  // Calculate missing vs total
  const missingOrders = otherCityOrders.filter((o) => {
    const st = rowStates[o.id];
    return !st || !st.trackingId || !st.saved;
  });

  const totalOtherCity = otherCityOrders.length;
  const missingCount = missingOrders.length;

  // Filter orders according to user selection and search query
  const displayedOrders = otherCityOrders.filter((o) => {
    const st = rowStates[o.id];
    if (filterMode === "missing") {
      if (st && st.saved && st.trackingId) return false;
    }
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const ref = (o.reference || "").toLowerCase();
    const name = (o.name || "").toLowerCase();
    const city = (o.city || "").toLowerCase();
    const phone = (o.phone || "").toLowerCase();
    const track = (st?.trackingId || "").toLowerCase();
    return (
      ref.includes(q) ||
      name.includes(q) ||
      city.includes(q) ||
      phone.includes(q) ||
      track.includes(q)
    );
  });

  const updateRow = (orderId: string, patch: Partial<OrderRowState>) => {
    setRowStates((prev) => ({
      ...prev,
      [orderId]: {
        ...(prev[orderId] || {
          courierName: "Pakistan Post",
          trackingId: "",
          actualCharges: "",
          saving: false,
          saved: false,
          messaged: false,
        }),
        ...patch,
      },
    }));
  };

  const handleApplyDefaultCourierToAll = () => {
    setRowStates((prev) => {
      const next = { ...prev };
      otherCityOrders.forEach((o) => {
        if (!next[o.id]?.trackingId || !next[o.id]?.saved) {
          next[o.id] = {
            ...(next[o.id] || {
              trackingId: "",
              actualCharges: "",
              saving: false,
              saved: false,
              messaged: false,
            }),
            courierName: defaultCourier,
          };
        }
      });
      return next;
    });
    toast.success(`Applied "${defaultCourier}" to all pending orders.`);
  };

  // Save single order tracking
  const handleSaveRow = async (order: any, focusNext = false) => {
    const st = rowStates[order.id];
    if (!st || !st.trackingId.trim()) {
      toast.error(`Please enter a tracking number for order #${order.reference}.`);
      return false;
    }

    updateRow(order.id, { saving: true, error: undefined });
    const parsedCharges = st.actualCharges.trim() ? parseFloat(st.actualCharges) : 0;

    try {
      await api("manage/orders/" + order.id, {
        action: "courier",
        courier_name: st.courierName.trim() || "Pakistan Post",
        courier_tracking_id: st.trackingId.trim(),
        status: "SHIPPED",
        actual_courier_charges:
          isNaN(parsedCharges) || parsedCharges < 0 ? 0 : parsedCharges,
      });

      updateRow(order.id, {
        saving: false,
        saved: true,
      });

      toast.success(`Tracking saved for #${order.reference}`);
      onSaved();

      // If user hit Enter, jump to the next input field
      if (focusNext) {
        const currentIndex = displayedOrders.findIndex((o) => o.id === order.id);
        if (currentIndex >= 0 && currentIndex < displayedOrders.length - 1) {
          const nextOrder = displayedOrders[currentIndex + 1];
          const nextInput = inputRefs.current[nextOrder.id];
          if (nextInput) {
            nextInput.focus();
            nextInput.select();
          }
        }
      }
      return true;
    } catch (err) {
      const msg = errorText(err);
      updateRow(order.id, { saving: false, error: msg });
      toast.error(`Error saving #${order.reference}: ${msg}`);
      return false;
    }
  };

  // Save all entered tracking numbers in bulk
  const handleSaveAll = async () => {
    const toSave = displayedOrders.filter((o) => {
      const st = rowStates[o.id];
      return st && st.trackingId.trim() && !st.saved;
    });

    if (toSave.length === 0) {
      toast.info("No unsaved tracking numbers to save.");
      return;
    }

    setBatchSaving(true);
    let successCount = 0;

    for (const order of toSave) {
      const ok = await handleSaveRow(order, false);
      if (ok) successCount++;
    }

    setBatchSaving(false);
    toast.success(`Successfully saved tracking for ${successCount} order(s)!`);
  };

  // WhatsApp Message Generator
  const getWhatsAppMessage = (order: any, st: OrderRowState) => {
    const studentName = (order.name || "Student").trim();
    const ref = order.reference || "Book Store";
    const courier = st.courierName || "courier";
    const tracking = st.trackingId.trim();
    const isPakPost =
      courier.toLowerCase().includes("post") ||
      tracking.toUpperCase().startsWith("UMS") ||
      tracking.toUpperCase().startsWith("EP") ||
      tracking.toUpperCase().startsWith("RP");

    let msg = `Salam ${studentName}, your order #${ref} has been dispatched via ${courier}. Tracking Number: ${tracking}.`;
    if (isPakPost) {
      msg += " Track online at: https://ep.gov.pk/";
    }
    msg += "\n\nThank you for choosing Campus Bookstore!";
    return msg;
  };

  const getWhatsAppLink = (order: any, st: OrderRowState) => {
    const phone = formatWhatsAppPhone(order.phone || "");
    const msg = getWhatsAppMessage(order, st);
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  };

  if (!mounted) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        backgroundColor: "rgba(15, 23, 42, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        overflowY: "auto",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "1050px",
          maxHeight: "92vh",
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          border: "1px solid #cbd5e1",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "18px 24px",
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
            color: "#ffffff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #334155",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: "rgba(2, 132, 199, 0.25)",
                border: "1px solid rgba(56, 189, 248, 0.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#38bdf8",
              }}
            >
              <Truck size={24} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#f8fafc" }}>
                  Quick GPO / Courier Tracking & WhatsApp Dispatch
                </h3>
                <span
                  style={{
                    fontSize: "0.72rem",
                    padding: "2px 8px",
                    borderRadius: 9999,
                    background: missingCount > 0 ? "#f59e0b" : "#10b981",
                    color: "#ffffff",
                    fontWeight: 700,
                  }}
                >
                  {missingCount > 0 ? `${missingCount} Pending Tracking` : "All Tracked ✓"}
                </span>
              </div>
              <p style={{ margin: "3px 0 0", fontSize: "0.82rem", color: "#94a3b8" }}>
                Enter Pakistan Post (UMS/EP) or courier tracking numbers from your booking receipt. Press <strong>Enter</strong> to auto-save and jump to next row!
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "rgba(255, 255, 255, 0.1)",
              border: "none",
              color: "#cbd5e1",
              borderRadius: "8px",
              width: 34,
              height: 34,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Controls Bar: Filters, Search & Default Courier */}
        <div
          style={{
            padding: "12px 24px",
            background: "#f8fafc",
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          {/* Left: Filter Tabs */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              onClick={() => setFilterMode("missing")}
              style={{
                padding: "6px 14px",
                borderRadius: "8px",
                fontSize: "0.82rem",
                fontWeight: 600,
                border: "1px solid",
                borderColor: filterMode === "missing" ? "#0284c7" : "#cbd5e1",
                background: filterMode === "missing" ? "#0284c7" : "#ffffff",
                color: filterMode === "missing" ? "#ffffff" : "#475569",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <AlertCircle size={14} />
              <span>Needs Tracking ({missingCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setFilterMode("all")}
              style={{
                padding: "6px 14px",
                borderRadius: "8px",
                fontSize: "0.82rem",
                fontWeight: 600,
                border: "1px solid",
                borderColor: filterMode === "all" ? "#0284c7" : "#cbd5e1",
                background: filterMode === "all" ? "#0284c7" : "#ffffff",
                color: filterMode === "all" ? "#ffffff" : "#475569",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Package size={14} />
              <span>All Courier Orders ({totalOtherCity})</span>
            </button>
          </div>

          {/* Right: Default Courier & Fast Search */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.82rem", color: "#475569" }}>
              <span style={{ fontWeight: 600 }}>Default Courier:</span>
              <select
                value={defaultCourier}
                onChange={(e) => setDefaultCourier(e.target.value)}
                style={{
                  padding: "5px 10px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.82rem",
                  background: "#ffffff",
                  color: "#0f172a",
                  fontWeight: 600,
                }}
              >
                {POPULAR_COURIERS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleApplyDefaultCourierToAll}
                style={{
                  padding: "5px 10px",
                  borderRadius: "6px",
                  border: "1px solid #94a3b8",
                  background: "#ffffff",
                  color: "#334155",
                  fontSize: "0.78rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
                title="Apply this courier company to all empty rows below"
              >
                Set All
              </button>
            </div>

            <div style={{ position: "relative", minWidth: 200 }}>
              <Search
                size={14}
                style={{
                  position: "absolute",
                  left: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#94a3b8",
                }}
              />
              <input
                type="text"
                placeholder="Search ref, student, city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "5px 10px 5px 30px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontSize: "0.82rem",
                  background: "#ffffff",
                  color: "#0f172a",
                }}
              />
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 24px" }}>
          {displayedOrders.length === 0 ? (
            <div style={{ padding: "48px 16px", textAlign: "center", color: "#64748b" }}>
              <CheckCircle2 size={40} style={{ color: "#10b981", margin: "0 auto 12px" }} />
              <h4 style={{ margin: "0 0 4px", fontSize: "1rem", color: "#1e293b", fontWeight: 700 }}>
                {filterMode === "missing"
                  ? "All Other City orders have tracking numbers assigned!"
                  : "No matching courier orders found."}
              </h4>
              <p style={{ margin: 0, fontSize: "0.85rem" }}>
                {filterMode === "missing"
                  ? "Switch to 'All Courier Orders' to view or message students."
                  : "Try clearing your search query."}
              </p>
            </div>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.83rem",
                marginTop: 8,
                marginBottom: 16,
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "2px solid #e2e8f0",
                    color: "#475569",
                    textAlign: "left",
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  <th style={{ padding: "12px 8px", width: "40px" }}>#</th>
                  <th style={{ padding: "12px 10px", width: "230px" }}>Order & Student</th>
                  <th style={{ padding: "12px 8px", width: "140px" }}>Courier</th>
                  <th style={{ padding: "12px 8px", width: "220px" }}>Article / UMS Tracking #</th>
                  <th style={{ padding: "12px 8px", width: "100px" }}>Postage (Rs.)</th>
                  <th style={{ padding: "12px 8px", textAlign: "center", width: "200px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedOrders.map((o, idx) => {
                  const st = rowStates[o.id] || {
                    courierName: "Pakistan Post",
                    trackingId: "",
                    actualCharges: "",
                    saving: false,
                    saved: false,
                    messaged: false,
                  };
                  const booksCount = Number(
                    o.total_books ??
                      (o.items?.reduce(
                        (s: number, it: any) => s + (it.quantity || 1),
                        0,
                      ) || 0),
                  );

                  return (
                    <tr
                      key={o.id}
                      style={{
                        borderBottom: "1px solid #f1f5f9",
                        backgroundColor: st.saved ? "#f8fafc" : "#ffffff",
                        transition: "background 0.15s ease",
                      }}
                    >
                      {/* # */}
                      <td style={{ padding: "10px 8px", color: "#94a3b8", fontWeight: 600 }}>
                        {idx + 1}
                      </td>

                      {/* Order & Student */}
                      <td style={{ padding: "10px 10px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span
                            style={{
                              fontFamily: "monospace",
                              fontWeight: 700,
                              color: "#0f172a",
                              fontSize: "0.86rem",
                            }}
                          >
                            #{o.reference}
                          </span>
                          <span
                            style={{
                              fontSize: "0.68rem",
                              fontWeight: 600,
                              padding: "1px 6px",
                              borderRadius: 4,
                              background: "#e0e7ff",
                              color: "#4338ca",
                            }}
                          >
                            {booksCount} {booksCount === 1 ? "Book" : "Books"}
                          </span>
                        </div>
                        <div style={{ fontWeight: 600, color: "#1e293b", marginTop: 2 }}>
                          {o.name}{" "}
                          <span style={{ fontWeight: 400, color: "#64748b", fontSize: "0.78rem" }}>
                            · {o.city || "Other City"}
                          </span>
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: 1 }}>
                          📞 {o.phone || "No Phone"}
                        </div>
                      </td>

                      {/* Courier Dropdown */}
                      <td style={{ padding: "10px 8px" }}>
                        <select
                          value={st.courierName}
                          onChange={(e) => {
                            updateRow(o.id, { courierName: e.target.value, saved: false });
                          }}
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            fontSize: "0.8rem",
                            background: "#ffffff",
                            color: "#0f172a",
                            fontWeight: 500,
                          }}
                        >
                          {POPULAR_COURIERS.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Tracking ID Input */}
                      <td style={{ padding: "10px 8px" }}>
                        <div style={{ position: "relative" }}>
                          <input
                            ref={(el) => {
                              inputRefs.current[o.id] = el;
                            }}
                            type="text"
                            placeholder="e.g. UMS54231890PK"
                            value={st.trackingId}
                            onChange={(e) => {
                              const val = e.target.value.trimStart();
                              const upper = val.trim().toUpperCase();
                              let detectedCourier = st.courierName;
                              if (
                                upper.startsWith("UMS") ||
                                upper.startsWith("EP") ||
                                upper.startsWith("RP") ||
                                upper.startsWith("CP")
                              ) {
                                detectedCourier = "Pakistan Post";
                              }
                              updateRow(o.id, {
                                trackingId: val,
                                courierName: detectedCourier,
                                saved: false,
                              });
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleSaveRow(o, true);
                              }
                            }}
                            style={{
                              width: "100%",
                              padding: "6px 10px",
                              borderRadius: "6px",
                              border: `1.5px solid ${st.saved ? "#10b981" : "#94a3b8"}`,
                              fontSize: "0.84rem",
                              fontFamily: "monospace",
                              fontWeight: 600,
                              background: st.saved ? "#f0fdf4" : "#ffffff",
                              color: "#0f172a",
                              outline: "none",
                            }}
                          />
                        </div>
                      </td>

                      {/* Actual Postage Cost */}
                      <td style={{ padding: "10px 8px" }}>
                        <input
                          type="number"
                          placeholder="Rs."
                          value={st.actualCharges}
                          onChange={(e) => {
                            updateRow(o.id, { actualCharges: e.target.value, saved: false });
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleSaveRow(o, true);
                            }
                          }}
                          style={{
                            width: "100%",
                            padding: "6px 8px",
                            borderRadius: "6px",
                            border: "1px solid #cbd5e1",
                            fontSize: "0.82rem",
                            textAlign: "right",
                            background: "#ffffff",
                            color: "#0f172a",
                          }}
                        />
                      </td>

                      {/* Action Buttons: Save & 1-Click WhatsApp */}
                      <td style={{ padding: "10px 8px", textAlign: "center" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                          }}
                        >
                          {/* Save Button */}
                          <button
                            type="button"
                            onClick={() => handleSaveRow(o, false)}
                            disabled={st.saving || !st.trackingId.trim()}
                            style={{
                              padding: "5px 10px",
                              borderRadius: "6px",
                              fontSize: "0.78rem",
                              fontWeight: 700,
                              border: "none",
                              background: st.saved ? "#e2e8f0" : "#0284c7",
                              color: st.saved ? "#475569" : "#ffffff",
                              cursor: st.saving || !st.trackingId.trim() ? "not-allowed" : "pointer",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                            title={st.saved ? "Saved to database" : "Save tracking number"}
                          >
                            {st.saving ? (
                              "..."
                            ) : st.saved ? (
                              <>
                                <Check size={13} style={{ color: "#10b981" }} />
                                <span>Saved</span>
                              </>
                            ) : (
                              <>
                                <Save size={13} />
                                <span>Save</span>
                              </>
                            )}
                          </button>

                          {/* 1-Click WhatsApp Send Button */}
                          {o.phone && st.trackingId.trim() ? (
                            <a
                              href={getWhatsAppLink(o, st)}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={() => {
                                updateRow(o.id, { messaged: true });
                              }}
                              style={{
                                padding: "5px 10px",
                                borderRadius: "6px",
                                fontSize: "0.78rem",
                                fontWeight: 700,
                                background: st.messaged ? "#15803d" : "#25D366",
                                color: "#ffffff",
                                textDecoration: "none",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                boxShadow: "0 2px 4px rgba(37, 211, 102, 0.2)",
                              }}
                              title="Send 1-Click WhatsApp tracking link to student"
                            >
                              <MessageCircle size={13} />
                              <span>{st.messaged ? "Sent ✓" : "WhatsApp"}</span>
                            </a>
                          ) : (
                            <button
                              type="button"
                              disabled
                              style={{
                                padding: "5px 10px",
                                borderRadius: "6px",
                                fontSize: "0.78rem",
                                fontWeight: 600,
                                background: "#f1f5f9",
                                color: "#94a3b8",
                                border: "1px solid #e2e8f0",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                                cursor: "not-allowed",
                              }}
                              title="Enter and save tracking number to enable WhatsApp"
                            >
                              <MessageCircle size={13} />
                              <span>WhatsApp</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "14px 24px",
            background: "#f8fafc",
            borderTop: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ fontSize: "0.82rem", color: "#64748b", display: "flex", alignItems: "center", gap: 16 }}>
            <span>
              Showing <strong>{displayedOrders.length}</strong> of <strong>{totalOtherCity}</strong> courier orders
            </span>
            <span style={{ color: "#cbd5e1" }}>|</span>
            <span style={{ color: "#0284c7" }}>
              💡 Tip: Press <strong>Enter</strong> to instantly save and jump to the next student!
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 18px",
                borderRadius: "8px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                color: "#334155",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Done / Close
            </button>

            <button
              type="button"
              onClick={handleSaveAll}
              disabled={batchSaving || displayedOrders.length === 0}
              style={{
                padding: "8px 20px",
                borderRadius: "8px",
                border: "none",
                background: "#0284c7",
                color: "#ffffff",
                fontSize: "0.85rem",
                fontWeight: 700,
                cursor: batchSaving ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                boxShadow: "0 2px 4px rgba(2, 132, 199, 0.3)",
              }}
            >
              <Save size={15} />
              <span>{batchSaving ? "Saving All..." : "Save All Tracking Numbers"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
