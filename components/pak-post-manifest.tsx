"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Printer, X, FileText, Calendar, CheckSquare, AlertCircle } from "lucide-react";
import { isOtherCityOrder } from "../lib/contracts";

interface PakPostManifestProps {
  orders: any[];
  settings?: any;
  onClose: () => void;
}

export function PakPostManifestModal({ orders, settings, onClose }: PakPostManifestProps) {
  const [mounted, setMounted] = useState(false);
  const [loadedSettings, setLoadedSettings] = useState<any>(settings || null);
  const [orientation, setOrientation] = useState<"landscape" | "portrait">("landscape");
  const [manifestDate, setManifestDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });

  useEffect(() => {
    setMounted(true);
    document.body.classList.add("gpo-manifest-modal-open");
    return () => {
      document.body.classList.remove("gpo-manifest-modal-open");
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

  // STRICT RULE: ONLY OTHER CITY COURIER ORDERS (Exclude Campus Pickup & Lahore Rider)
  const courierOnlyOrders = (orders || []).filter((o) => isOtherCityOrder(o));

  // Process rows
  const orderRows = courierOnlyOrders.map((o) => {
    const activeItems = (o.items || []).filter((i: any) => !i.is_unavailable);
    const totalPages = activeItems.reduce(
      (acc: number, it: any) => acc + Number(it.pages || 0) * Number(it.quantity || 1),
      0
    );
    const estWeightGrams = Math.round(totalPages * 2.3 + 50);
    const booksCount = activeItems.reduce((acc: number, it: any) => acc + Number(it.quantity || 1), 0);
    const bookTitles = activeItems.map((it: any) => it.code || it.course_code || it.title).join(", ");
    const trackingNo = (o.courier_tracking_id || "").trim();
    const isPakPost =
      trackingNo.toUpperCase().startsWith("UMS") ||
      trackingNo.toUpperCase().startsWith("EP") ||
      trackingNo.toUpperCase().startsWith("RP") ||
      (o.courier_name && o.courier_name.toLowerCase().includes("post"));

    return {
      id: o.id,
      reference: o.reference || o.id,
      studentName: o.name || "Student",
      phone: o.phone || "—",
      city: o.city || "Other City",
      address: o.address || "—",
      totalPages,
      estWeightGrams,
      booksCount,
      bookTitles,
      trackingNo,
      isPakPost,
    };
  });

  const totalParcels = orderRows.length;
  const totalWeightGrams = orderRows.reduce((acc, r) => acc + r.estWeightGrams, 0);
  const totalWeightKg = (totalWeightGrams / 1000).toFixed(2);

  const handlePrint = () => {
    window.print();
  };

  if (!mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-start overflow-y-auto p-3 md:p-6 no-print-backdrop gpo-manifest-modal-portal">
      {/* Top Controls Toolbar (Hidden during actual paper printing) */}
      <div className="w-full max-w-6xl bg-slate-900 border border-slate-800 rounded-xl p-3 md:p-4 mb-4 flex flex-wrap items-center justify-between gap-3 text-white shadow-xl no-print">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
            <FileText size={22} />
          </div>
          <div>
            <h3 className="font-bold text-sm md:text-base flex items-center gap-2">
              Pakistan Post GPO Daily Booking Manifest
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                Other City Courier Parcels Only
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              {totalParcels} courier parcel{totalParcels === 1 ? "" : "s"} • Official weight measured on Post Office counter scale • Single-page fit for GPO stamp & sign
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Orientation Toggle */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setOrientation("landscape")}
              className={`px-2.5 py-1 rounded font-semibold transition-all ${
                orientation === "landscape" ? "bg-emerald-600 text-white shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              A4 Landscape (Recommended)
            </button>
            <button
              type="button"
              onClick={() => setOrientation("portrait")}
              className={`px-2.5 py-1 rounded font-semibold transition-all ${
                orientation === "portrait" ? "bg-emerald-600 text-white shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              A4 Portrait
            </button>
          </div>

          {/* Date Picker with 100% visible text */}
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs text-white">
            <Calendar size={14} className="text-emerald-400" />
            <span className="text-slate-300 font-medium whitespace-nowrap">Date:</span>
            <input
              type="date"
              value={manifestDate}
              onChange={(e) => setManifestDate(e.target.value)}
              style={{
                backgroundColor: "#1e293b",
                color: "#ffffff",
                colorScheme: "dark",
                border: "1px solid #475569",
                borderRadius: "5px",
                padding: "3px 8px",
                fontSize: "12px",
                fontWeight: 600,
                outline: "none",
                cursor: "pointer",
              }}
            />
          </div>

          <button
            type="button"
            onClick={handlePrint}
            disabled={totalParcels === 0}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow transition-all cursor-pointer"
          >
            <Printer size={15} />
            <span>Print Manifest (Fit 1 Page)</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Empty State if no Other City Courier orders */}
      {totalParcels === 0 ? (
        <div className="w-full max-w-2xl bg-white text-slate-900 rounded-xl p-8 text-center shadow-2xl no-print">
          <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto mb-3">
            <AlertCircle size={28} />
          </div>
          <h3 className="font-bold text-lg text-slate-900 mb-1">
            No Other City Courier Orders Found
          </h3>
          <p className="text-sm text-slate-600 max-w-md mx-auto mb-4">
            Pakistan Post GPO Manifest is strictly for <strong>Other City Courier parcels</strong> nationwide.
            Local <strong>Lahore rider deliveries</strong> and <strong>VU Qanchi Campus pickups</strong> do not go to the GPO and are excluded.
          </p>
          <div className="flex justify-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg"
            >
              Close & Select Other City Orders
            </button>
          </div>
        </div>
      ) : (
        /* Printable Sheet Area (Guaranteed Single Page Fit) */
        <div
          className={`w-full ${
            orientation === "landscape" ? "max-w-6xl" : "max-w-4xl"
          } bg-white text-slate-950 rounded-xl border border-slate-200 p-4 md:p-6 shadow-2xl gpo-manifest-printable font-sans`}
          style={{ boxSizing: "border-box" }}
        >
          {/* Manifest Header (Compact Single Row) */}
          <div className="border-b-2 border-slate-950 pb-2 mb-2">
            <div className="flex justify-between items-center gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-emerald-900 text-white font-black text-[10px] px-1.5 py-0.5 rounded tracking-wider uppercase">
                    PAKISTAN POST GPO
                  </span>
                  <span className="text-xs font-black text-slate-900 uppercase tracking-wide">
                    DAILY PARCEL BOOKING MANIFEST (OTHER CITIES)
                  </span>
                </div>
                <div className="text-[10px] text-slate-700 mt-0.5 flex items-center gap-2 flex-wrap font-medium">
                  <span><strong>Sender:</strong> {storeName}</span>
                  <span>•</span>
                  <span><strong>Origin:</strong> {dispatchAddress}</span>
                  <span>•</span>
                  <span><strong>Helpline:</strong> {storePhone}</span>
                </div>
              </div>

              <div className="text-right border-l-2 border-slate-300 pl-3">
                <div className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                  Booking Date: <strong>{new Date(manifestDate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</strong>
                </div>
                <div className="text-[10px] text-slate-800 font-black">
                  Total: {totalParcels} Other City Parcels
                </div>
              </div>
            </div>
          </div>

          {/* Parcels Table Matrix (Compact row heights & font for single page fit) */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" style={{ fontSize: "10px" }}>
              <thead>
                <tr className="border-b-2 border-slate-900 bg-slate-100 text-slate-950 font-black uppercase text-[9.5px] tracking-wider">
                  <th className="py-1 px-1 text-center w-8">#</th>
                  <th className="py-1 px-1.5 w-24">Order Ref</th>
                  <th className="py-1 px-1.5 w-32">Pak Post Article / UMS #</th>
                  <th className="py-1 px-1.5 w-40">Consignee Name & Phone</th>
                  <th className="py-1 px-1.5">Destination City & Full Address</th>
                  <th className="py-1 px-1.5 w-32">Contents (Books)</th>
                  <th className="py-1 px-1 text-right w-16">Weight</th>
                  <th className="py-1 px-1 text-center w-20">Postage</th>
                  <th className="py-1 px-1 text-center w-8">Tick</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {orderRows.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-slate-50 leading-tight">
                    <td className="py-1 px-1 text-center font-bold text-slate-700">{idx + 1}</td>
                    <td className="py-1 px-1.5 font-mono font-black text-slate-950 whitespace-nowrap">
                      {r.reference}
                    </td>
                    <td className="py-1 px-1.5 font-mono">
                      {r.trackingNo ? (
                        <span className="font-bold text-slate-950 bg-slate-100 px-1 py-0.5 rounded border border-slate-300">
                          {r.trackingNo}
                        </span>
                      ) : (
                        <div className="border border-dashed border-slate-400 text-slate-400 text-[9px] text-center py-0.5 rounded">
                          [ Paste UMS Sticker ]
                        </div>
                      )}
                    </td>
                    <td className="py-1 px-1.5">
                      <div className="font-black text-slate-950">{r.studentName}</div>
                      <div className="text-[9px] font-mono text-slate-600">{r.phone}</div>
                    </td>
                    <td className="py-1 px-1.5">
                      <div className="font-black text-slate-950 uppercase text-[10px]">{r.city}</div>
                      <div className="text-[9px] text-slate-600 truncate max-w-[260px]" title={r.address}>
                        {r.address}
                      </div>
                    </td>
                    <td className="py-1 px-1.5">
                      <span className="font-black text-slate-900">{r.booksCount} {r.booksCount === 1 ? "Book" : "Books"}</span>
                      <span className="text-[9px] text-slate-500 block truncate max-w-[130px]" title={r.bookTitles}>
                        {r.bookTitles}
                      </span>
                    </td>
                    <td className="py-1 px-1 text-center">
                      <div className="border border-slate-300 rounded px-1 py-0.5 text-center font-mono text-slate-400 text-[9px] bg-slate-50/50">
                        [ _____ g ]
                      </div>
                    </td>
                    <td className="py-1 px-1 text-center">
                      <div className="border-b border-slate-300 text-slate-400 text-[9px] font-mono py-0.5">
                        Rs. _____
                      </div>
                    </td>
                    <td className="py-1 px-1 text-center">
                      <div className="w-3.5 h-3.5 border border-slate-400 rounded-sm mx-auto"></div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-950 bg-slate-50 font-black text-slate-950 text-[10px]">
                  <td colSpan={2} className="py-1 px-1 uppercase text-right">
                    Total:
                  </td>
                  <td className="py-1 px-1.5 font-mono">
                    {totalParcels} Other City Parcels
                  </td>
                  <td colSpan={3} className="py-1 px-1.5 uppercase text-right">
                    Official Gross Weight:
                  </td>
                  <td className="py-1 px-1 text-center font-mono text-slate-700 font-bold whitespace-nowrap text-[9px]">
                    [ Counter Scale ]
                  </td>
                  <td colSpan={2} className="py-1 px-1 text-center text-[9px] text-slate-500">
                    Post Office Verified
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Official Signatures & GPO Stamp (Ultra-compact footer to fit on 1 single page) */}
          <div className="mt-3 pt-2 border-t-2 border-slate-950">
            <div className="grid grid-cols-3 gap-3 text-center">
              {/* Box 1: Sender Dispatcher */}
              <div className="border border-slate-300 rounded p-1.5 bg-slate-50/50">
                <div className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">
                  Booking Firm / Dispatcher
                </div>
                <div className="h-8 flex items-end justify-center pb-0.5">
                  <div className="w-28 border-b border-slate-400"></div>
                </div>
                <div className="text-[10px] font-bold text-slate-900 mt-0.5">{storeName}</div>
                <div className="text-[8px] text-slate-500">Authorized Signature & Date</div>
              </div>

              {/* Box 2: Post Office Counter Clerk */}
              <div className="border border-slate-300 rounded p-1.5 bg-slate-50/50">
                <div className="text-[9px] font-bold text-slate-600 uppercase tracking-wider">
                  Pakistan Post Booking Clerk
                </div>
                <div className="h-8 flex items-end justify-center pb-0.5">
                  <div className="w-28 border-b border-slate-400"></div>
                </div>
                <div className="text-[10px] font-bold text-slate-900 mt-0.5">Counter Acceptance Clerk</div>
                <div className="text-[8px] text-slate-500">Clerk Signature / PPO ID</div>
              </div>

              {/* Box 3: GPO Official Stamp Box */}
              <div className="border border-dashed border-slate-400 rounded p-1.5 flex flex-col items-center justify-center bg-slate-50/30">
                <div className="text-[8.5px] font-black text-slate-500 uppercase tracking-wider">
                  GPO OFFICIAL ROUND STAMP
                </div>
                <div className="w-12 h-12 rounded-full border border-dashed border-slate-300 flex items-center justify-center text-[7.5px] text-slate-400 text-center mt-0.5">
                  Stamp Here
                </div>
              </div>
            </div>

            <div className="text-[8px] text-slate-500 text-center mt-1">
              Official Consignment Dispatch Record • All consignments contain educational syllabus textbooks.
            </div>
          </div>
        </div>
      )}

      {/* Manifest Print CSS (Strict single-page enforcement) */}
      <style>{`
        @media print {
          html, body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: 100% !important;
          }
          body.gpo-manifest-modal-open > *:not(.gpo-manifest-modal-portal) {
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
          .gpo-manifest-modal-portal {
            position: static !important;
            display: block !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
            overflow: visible !important;
          }
          .gpo-manifest-printable {
            box-shadow: none !important;
            border: none !important;
            max-width: 100% !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          table {
            page-break-inside: avoid !important;
          }
          tr {
            page-break-inside: avoid !important;
          }
          @page {
            size: ${orientation === "landscape" ? "A4 landscape" : "A4 portrait"};
            margin: 6mm 8mm;
          }
        }
      `}</style>
    </div>
  );

  return createPortal(modalContent, document.body);
}
