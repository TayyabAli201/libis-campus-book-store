"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Printer, X, Tag } from "lucide-react";

interface ShippingLabelProps {
  orders: any[];
  settings?: any;
  onClose?: () => void;
}

export function ShippingLabelModal({ orders, settings, onClose }: ShippingLabelProps) {
  const [format, setFormat] = useState<"a4" | "thermal">("a4");
  const [loadedSettings, setLoadedSettings] = useState<any>(settings || null);
  const [mounted, setMounted] = useState(false);

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

  const handlePrint = () => {
    window.print();
  };

  if (!mounted || !orders || orders.length === 0) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-start overflow-y-auto p-3 md:p-6 no-print-backdrop shipping-label-modal-portal">
      {/* Control Bar (hidden during actual paper print) */}
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-xl p-3 md:p-4 mb-4 flex flex-wrap items-center justify-between gap-3 text-white shadow-xl no-print">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400">
            <Tag size={20} />
          </div>
          <div>
            <h3 className="font-bold text-sm md:text-base">Print Parcel Shipping Labels</h3>
            <p className="text-xs text-slate-400">
              {orders.length} parcel{orders.length > 1 ? "s" : ""} • Clean compact layout (No barcode) • Multiple labels per A4 sheet
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Format Toggle */}
          <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setFormat("a4")}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                format === "a4" ? "bg-purple-600 text-white shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              A4 Sheet (6-8 per page)
            </button>
            <button
              type="button"
              onClick={() => setFormat("thermal")}
              className={`px-3 py-1.5 rounded-md font-semibold transition-all ${
                format === "thermal" ? "bg-purple-600 text-white shadow" : "text-slate-400 hover:text-white"
              }`}
            >
              4x6" Thermal Sticker
            </button>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow transition-all cursor-pointer"
          >
            <Printer size={16} />
            <span>Print All ({orders.length})</span>
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
      <div
        className={`shipping-label-printable-area ${
          format === "a4"
            ? "grid grid-cols-1 md:grid-cols-2 gap-3 max-w-5xl w-full"
            : "flex flex-col gap-5 items-center"
        }`}
      >
        {orders.map((o) => {
          const activeItems = (o.items || []).filter((i: any) => !i.is_unavailable);
          const totalBooks = activeItems.reduce((acc: number, it: any) => acc + Number(it.quantity || 1), 0);
          const trackingNo = (o.courier_tracking_id || "").trim();
          const isPakPost =
            trackingNo.toUpperCase().startsWith("UMS") ||
            trackingNo.toUpperCase().startsWith("EP") ||
            trackingNo.toUpperCase().startsWith("RP") ||
            (o.courier_name && o.courier_name.toLowerCase().includes("post"));

          return (
            <div
              key={o.id}
              className="shipping-label-card bg-white text-black p-3 border-2 border-black rounded select-none font-sans"
              style={{
                width: format === "thermal" ? "380px" : "100%",
                boxSizing: "border-box",
                background: "#ffffff",
                color: "#000000",
                pageBreakInside: "avoid",
                breakInside: "avoid",
              }}
            >
              {/* Header: Sender & Courier Type */}
              <div className="flex justify-between items-start border-b-2 border-black pb-1.5 mb-1.5">
                <div>
                  <div className="text-xs font-bold uppercase text-gray-700">FROM (SENDER):</div>
                  <div className="text-sm font-black tracking-tight leading-tight">{storeName}</div>
                  <div className="text-[10px] text-gray-800 font-medium">
                    Origin: {dispatchAddress} • Helpline: {storePhone}
                  </div>
                </div>
                <div className="text-right">
                  <span className="border-2 border-black px-1.5 py-0.5 font-black text-[10px] uppercase bg-black text-white">
                    {isPakPost ? "PAK POST" : o.delivery_type === "campus" ? "CAMPUS" : "COURIER"}
                  </span>
                  <div className="text-[9px] font-bold mt-0.5 uppercase text-gray-800">
                    {isPakPost ? "UMS EXPRESS" : o.delivery_type === "campus" ? (o.campus_name || "BOOTH PICKUP") : "PARCEL"}
                  </div>
                </div>
              </div>

              {/* Consignee (Student Delivery Details) */}
              <div className="border-b-2 border-black pb-1.5 mb-1.5 space-y-0.5">
                <div className="flex justify-between items-baseline">
                  <span className="text-[9px] font-black uppercase tracking-wider text-gray-700">DELIVER TO:</span>
                  <span className="text-xs font-black uppercase text-black bg-gray-100 px-1 rounded border border-gray-400">
                    CITY: {String(o.city || "OTHER CITY").toUpperCase()}
                  </span>
                </div>
                <div className="text-base font-black leading-tight text-black">
                  {o.name || "Student"}
                </div>
                <div className="text-xs font-bold text-black font-mono">
                  Phone: {o.phone || "—"} {o.alternate_phone ? `| Alt: ${o.alternate_phone}` : ""}
                </div>
                <div className="text-xs font-medium leading-tight text-gray-900 pt-0.5">
                  <strong>Address:</strong> {o.address || "Address not provided"}
                </div>
                {o.instructions && (
                  <div className="text-[9.5px] italic text-gray-800 bg-gray-100 p-1 border border-gray-300 rounded mt-0.5">
                    Note: {o.instructions}
                  </div>
                )}
              </div>

              {/* Order Reference & Date Box */}
              <div className="flex justify-between items-center border-b-2 border-black pb-1 mb-1.5 text-xs font-mono">
                <div>
                  <span className="text-[9px] font-bold text-gray-600 block uppercase font-sans">ORDER REFERENCE:</span>
                  <strong className="text-sm font-black text-black">{o.reference || o.id}</strong>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-bold text-gray-600 block uppercase font-sans">ORDER DATE:</span>
                  <strong className="text-[11px] text-gray-900">
                    {new Date(o.created_at || Date.now()).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </strong>
                </div>
                {trackingNo && (
                  <div className="text-right pl-2 border-l border-gray-300">
                    <span className="text-[8px] font-bold text-gray-600 block uppercase font-sans">TRACKING #:</span>
                    <strong className="text-[10px] text-black font-mono bg-gray-100 px-1 py-0.5 rounded border border-gray-300">
                      {trackingNo}
                    </strong>
                  </div>
                )}
              </div>

              {/* Package Contents */}
              <div className="border-b border-black pb-1 mb-1">
                <div className="flex justify-between items-baseline mb-0.5">
                  <span className="text-[9px] font-bold text-gray-700 uppercase font-sans">
                    CONTENTS (EDUCATIONAL TEXTBOOKS):
                  </span>
                  <span className="text-[9.5px] font-black text-black">
                    Total: {totalBooks} {totalBooks === 1 ? "Book" : "Books"}
                  </span>
                </div>
                <div className="text-[9.5px] leading-tight text-gray-900 truncate max-w-[360px]" title={activeItems.map((it: any) => `${it.code || it.course_code} (x${it.quantity || 1})`).join(", ")}>
                  {activeItems.map((it: any, idx: number) => (
                    <span key={idx} className="font-semibold">
                      {idx > 0 ? " • " : ""}{it.code || it.course_code || it.title} {Number(it.quantity || 1) > 1 ? `(x${it.quantity})` : ""}
                    </span>
                  ))}
                  {activeItems.length === 0 && <span className="text-gray-500 italic">No items</span>}
                </div>
              </div>

              {/* Footer Notice */}
              <div className="flex justify-between items-center text-[8.5px] font-black uppercase tracking-wider text-gray-800 pt-0.5">
                <span>EDUCATIONAL SYLLABUS MATERIAL</span>
                <span>HANDLE WITH CARE / DO NOT BEND</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Embedded Print CSS for Multiple Labels per A4 Page */}
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
            display: grid !important;
            grid-template-columns: ${format === "a4" ? "repeat(2, 1fr)" : "1fr"} !important;
            gap: 6mm !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .shipping-label-card {
            box-shadow: none !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            margin: 0 !important;
          }
          @page {
            size: ${format === "a4" ? "A4 portrait" : "100mm 150mm"};
            margin: 8mm 6mm;
          }
        }
      `}</style>
    </div>
  );

  return createPortal(modalContent, document.body);
}
