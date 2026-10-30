"use client";

import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Printer, X, Copy, Check, Tag } from "lucide-react";

interface ShippingLabelProps {
  orders: any[];
  settings?: any;
  onClose?: () => void;
}

export function ShippingLabelModal({ orders, settings, onClose }: ShippingLabelProps) {
  const [format, setFormat] = useState<"thermal" | "a4">("thermal");
  const [loadedSettings, setLoadedSettings] = useState<any>(settings || null);
  const [mounted, setMounted] = useState(false);
  const barcodeRefs = useRef<Record<string, SVGSVGElement | null>>({});

  useEffect(() => {
    setMounted(true);
    document.body.classList.add("shipping-modal-open");
    return () => {
      document.body.classList.remove("shipping-modal-open");
    };
  }, []);

  useEffect(() => {
    if (!settings && !loadedSettings) {
      fetch("/api/manage/settings")
        .then((r) => (r.ok ? r.json() : fetch("/api/catalog").then((r2) => (r2.ok ? r2.json() : null))))
        .then((d: any) => {
          if (d?.settings) setLoadedSettings(d.settings);
        })
        .catch(() => {});
    }
  }, [settings, loadedSettings]);

  const activeSettings = loadedSettings || settings;
  const storeName = activeSettings?.store_name || "LIBIS Campus Bookstore";
  const dispatchAddress = activeSettings?.distribution_center_address || "Qanchi, Lahore";
  const storePhone = activeSettings?.whatsapp || "03034049973";

  useEffect(() => {
    let active = true;
    import("jsbarcode")
      .then((mod) => {
        const JsBarcode = mod.default || mod;
        if (!active) return;
        orders.forEach((o) => {
          const ref = o.reference || o.id;
          const el = barcodeRefs.current[ref];
          if (el && ref) {
            try {
              JsBarcode(el, ref, {
                format: "CODE128",
                width: 1.6,
                height: 38,
                displayValue: true,
                fontSize: 12,
                font: "monospace",
                margin: 2,
                lineColor: "#000000",
              });
            } catch {
              // Fallback if barcode fails
            }
          }
        });
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [orders, format]);

  const handlePrint = () => {
    window.print();
  };

  if (!mounted || !orders || orders.length === 0) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-start overflow-y-auto p-4 md:p-6 no-print-backdrop shipping-label-modal-portal">
      {/* Control Bar (hidden during actual paper print) */}
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-xl p-4 mb-4 flex flex-wrap items-center justify-between gap-3 text-white shadow-xl no-print">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
            <Tag size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm">Print Parcel Shipping Labels</h3>
            <p className="text-xs text-slate-400">
              {orders.length} order{orders.length > 1 ? "s" : ""} selected • Details dynamically synced from Store Settings
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Format Toggle */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setFormat("thermal")}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                format === "thermal" ? "bg-purple-600 text-white shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              4x6" Thermal (100x150mm)
            </button>
            <button
              type="button"
              onClick={() => setFormat("a4")}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                format === "a4" ? "bg-purple-600 text-white shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              A4 Sheet (4 per page)
            </button>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow transition-all cursor-pointer"
          >
            <Printer size={16} />
            <span>Print {orders.length > 1 ? `All (${orders.length})` : "Label"}</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
              title="Close"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Printable Area */}
      <div className={`shipping-label-printable-area ${format === "a4" ? "grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl w-full" : "flex flex-col gap-6 items-center"}`}>
        {orders.map((o) => {
          const activeItems = (o.items || []).filter((i: any) => !i.is_unavailable);
          const totalPages = activeItems.reduce((acc: number, it: any) => acc + (Number(it.pages || 0) * Number(it.quantity || 1)), 0);
          const estWeight = Math.round(totalPages * 2.3 + 50);
          const trackingNo = o.courier_tracking_id || "";
          const isPakPost = trackingNo.toUpperCase().startsWith("UMS") || trackingNo.toUpperCase().startsWith("EP") || trackingNo.toUpperCase().startsWith("RP");

          return (
            <div
              key={o.id}
              className="shipping-label-card bg-white text-black p-4 border-2 border-black rounded shadow-lg select-none font-mono"
              style={{
                width: format === "thermal" ? "380px" : "100%",
                minHeight: format === "thermal" ? "560px" : "480px",
                pageBreakAfter: format === "thermal" ? "always" : "auto",
                boxSizing: "border-box",
                background: "#ffffff",
                color: "#000000",
              }}
            >
              {/* Header */}
              <div className="flex justify-between items-center border-b-2 border-black pb-2">
                <div>
                  <div className="text-base font-extrabold tracking-tight leading-none">{storeName}</div>
                  <div className="text-[10px] text-gray-700 mt-1">From: {dispatchAddress} • Ph: {storePhone}</div>
                </div>
                <div className="text-right">
                  <span className="border-2 border-black px-1.5 py-0.5 font-black text-[11px] uppercase">
                    {isPakPost ? "PAK POST" : o.delivery_type === "campus" ? "CAMPUS" : "PARCEL"}
                  </span>
                  <div className="text-[9px] font-bold mt-0.5 uppercase">
                    {isPakPost ? "UMS EXPRESS" : o.delivery_type === "campus" ? (o.campus_name || "BOOTH PICKUP") : "COURIER"}
                  </div>
                </div>
              </div>

              {/* Courier Tracking Box (if assigned) */}
              {trackingNo ? (
                <div className="my-2 py-1.5 px-2 bg-gray-100 border border-black text-center rounded">
                  <div className="text-[9px] font-bold text-gray-700 uppercase">
                    {isPakPost ? "Pakistan Post Article Number" : "Courier Consignment No"}:
                  </div>
                  <div className="text-sm font-black tracking-widest text-black mt-0.5">{trackingNo}</div>
                </div>
              ) : (
                <div className="my-2 py-1 px-2 border border-dashed border-gray-400 text-center text-[10px] text-gray-500">
                  [ GPO / Courier Booking Sticker Space ]
                </div>
              )}

              {/* Consignee (Student) Details */}
              <div className="border-b-2 border-black pb-2 mb-2 space-y-1">
                <div className="text-[9px] font-bold uppercase text-gray-600">DELIVER TO (STUDENT):</div>
                <div className="text-sm font-black leading-tight text-black">
                  {o.name || "Student"}
                </div>
                <div className="text-xs font-bold text-black">
                  Phone: {o.phone || "—"} {o.alternate_phone ? `| Alt: ${o.alternate_phone}` : ""}
                </div>
                <div className="text-xs font-medium leading-tight text-gray-900 mt-1">
                  {o.address || "No street address provided"}
                </div>
                <div className="flex justify-between items-center pt-1 font-extrabold text-xs">
                  <span>CITY: {String(o.city || "—").toUpperCase()}</span>
                  <span>DEST: {o.delivery_type === "campus" ? "CAMPUS PICKUP" : "HOME DELIVERY"}</span>
                </div>
                {o.instructions && (
                  <div className="text-[10px] italic text-gray-700 bg-gray-50 p-1 border-t border-gray-200 mt-1">
                    Note: {o.instructions}
                  </div>
                )}
              </div>

              {/* Order Reference Barcode */}
              <div className="text-center border-b-2 border-black pb-2 mb-2">
                <div className="text-[9px] font-bold text-gray-600">ORDER IDENTIFIER:</div>
                <div className="flex justify-center my-0.5">
                  <svg
                    ref={(el) => {
                      barcodeRefs.current[o.reference || o.id] = el;
                    }}
                    className="max-h-12 w-auto"
                  ></svg>
                </div>
                <div className="flex justify-between text-[10px] text-gray-700 font-bold px-1">
                  <span>Date: {new Date(o.created_at || Date.now()).toLocaleDateString("en-GB")}</span>
                  <span>Est. Weight: ~{estWeight}g</span>
                </div>
              </div>

              {/* Package Contents */}
              <div className="border-b-2 border-black pb-2 mb-2">
                <div className="text-[9px] font-bold text-gray-600 mb-1">PARCEL CONTENTS (SYLLABUS BOOKS):</div>
                <div className="space-y-0.5 max-h-28 overflow-hidden text-[10px]">
                  {activeItems.map((it: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-baseline font-bold leading-tight">
                      <span className="truncate max-w-[280px]">
                        {idx + 1}. {it.code || it.course_code} - {it.title}
                      </span>
                      <span className="whitespace-nowrap ml-2">Qty: {it.quantity}</span>
                    </div>
                  ))}
                  {activeItems.length === 0 && <div className="text-gray-500 italic">No items</div>}
                </div>
                <div className="text-[9px] text-gray-600 mt-1 font-bold">
                  Total Books: {activeItems.reduce((sum: number, it: any) => sum + Number(it.quantity || 1), 0)} | Total Pages: {totalPages}
                </div>
              </div>

              {/* Footer Stamp */}
              <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-wider pt-0.5">
                <span className="border border-black px-1.5 py-0.5">EDUCATIONAL MATERIAL</span>
                <span>HANDLE WITH CARE / DO NOT BEND</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Embedded Print CSS for exact 4x6" and A4 Output */}
      <style>{`
        @media print {
          html, body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
          }
          /* Hide background website */
          body.shipping-modal-open > *:not(.shipping-label-modal-portal) {
            display: none !important;
          }
          .portal-shell,
          .portal-main,
          header,
          footer,
          [data-slot="sidebar"],
          .no-print,
          .no-print-backdrop {
            display: none !important;
          }
          .shipping-label-modal-portal {
            position: static !important;
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
            overflow: visible !important;
          }
          .shipping-label-printable-area {
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .shipping-label-card {
            box-shadow: none !important;
            margin: 0 auto 20px auto !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          @page {
            size: auto;
            margin: 4mm;
          }
        }
      `}</style>
    </div>
  );

  return createPortal(modalContent, document.body);
}
