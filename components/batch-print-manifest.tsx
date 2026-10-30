"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Printer, X, Download, CheckSquare, Square, Layers, BookOpen, Package } from "lucide-react";

interface BatchPrintManifestProps {
  vendorId?: string;
  vendorName?: string;
  onClose?: () => void;
}

export function BatchPrintManifestModal({ vendorId, vendorName, onClose }: BatchPrintManifestProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completedBooks, setCompletedBooks] = useState<Record<string, boolean>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.body.classList.add("manifest-modal-open");
    return () => {
      document.body.classList.remove("manifest-modal-open");
    };
  }, []);

  useEffect(() => {
    let active = true;
    const fetchManifest = async () => {
      setLoading(true);
      setError(null);
      try {
        const query = vendorId ? `?vendor_id=${encodeURIComponent(vendorId)}` : "";
        const res = await fetch(`/api/manage/vendor-batch-manifest${query}`);
        if (!res.ok) {
          const errData: any = await res.json().catch(() => ({}));
          throw new Error(errData.message || "Failed to load vendor batch manifest.");
        }
        const json = await res.json();
        if (active) {
          setData(json);
        }
      } catch (err: any) {
        if (active) setError(err.message || "Failed to load manifest.");
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchManifest();
    return () => {
      active = false;
    };
  }, [vendorId]);

  const toggleBookDone = (code: string) => {
    setCompletedBooks((prev) => ({
      ...prev,
      [code]: !prev[code],
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  if (!mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-50 bg-black/80 flex flex-col items-center justify-start overflow-y-auto p-4 md:p-6 no-print-backdrop manifest-modal-portal">
      {/* Header Controls (Hidden on Paper Print) */}
      <div className="w-full max-w-5xl bg-slate-900 border border-slate-800 rounded-xl p-4 mb-4 flex flex-wrap items-center justify-between gap-3 text-white shadow-xl no-print">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-500/20 text-indigo-400">
            <Layers size={22} />
          </div>
          <div>
            <h3 className="font-bold text-sm md:text-base">Vendor Batch Production & Print Manifest</h3>
            <p className="text-xs text-slate-400">
              Consolidated print matrix for machine operators • Single copies aggregated into bulk jobs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {data && (
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow transition-all cursor-pointer"
            >
              <Printer size={16} />
              <span>Print Job Sheet (A4)</span>
            </button>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all cursor-pointer"
              title="Close"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area (A4 Sheet on paper) */}
      <div className="w-full max-w-5xl bg-white text-slate-900 rounded-xl border border-slate-200 p-5 md:p-6 shadow-2xl manifest-printable">
        {loading && (
          <div className="py-16 text-center text-slate-500 font-sans">
            <div className="inline-block animate-spin w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full mb-3"></div>
            <p className="text-sm font-semibold">Generating vendor batch production matrix...</p>
          </div>
        )}

        {error && (
          <div className="py-12 text-center text-rose-600 font-sans">
            <p className="text-sm font-bold">Error: {error}</p>
          </div>
        )}

        {data && !loading && (
          <div className="font-sans space-y-3">
            {/* Sheet Header */}
            <div className="border-b-2 border-slate-900 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase font-extrabold tracking-widest text-indigo-700">LIBIS CAMPUS BOOKSTORE</div>
                <h1 className="text-xl font-black text-slate-950 mt-0.5 leading-tight">Master Print & Production Job Sheet</h1>
                <div className="text-[11px] text-slate-600 mt-0.5 font-mono">
                  Batch: <strong className="text-slate-950 font-bold">{data.batchId}</strong> • Generated: {new Date(data.generatedAt).toLocaleString("en-GB")}
                </div>
              </div>
              <div className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1.5 text-right text-[11px] font-mono leading-tight">
                <div>Vendor: <strong className="text-slate-950 font-bold">{data.vendor.name}</strong></div>
                <div className="text-slate-600">Rate: Rs. {Number(data.vendor.perPageRate).toFixed(2)}/pg • Binding: Rs. {Number(data.vendor.bindingRate).toFixed(2)}/bk</div>
                <div className="text-slate-600">Contact: {data.vendor.phone || "—"}</div>
              </div>
            </div>

            {/* KPI Summary Strip */}
            <div className="grid grid-cols-5 gap-2 text-center">
              <div className="bg-slate-50 border border-slate-200 py-1.5 px-2 rounded">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Titles</div>
                <div className="text-base font-black text-indigo-700 mt-0.5">{data.summary.totalTitles}</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 py-1.5 px-2 rounded">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Books</div>
                <div className="text-base font-black text-slate-900 mt-0.5">{data.summary.totalBooks}</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 py-1.5 px-2 rounded">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Sheets</div>
                <div className="text-base font-black text-slate-900 mt-0.5">{data.summary.totalPages.toLocaleString()}</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 py-1.5 px-2 rounded">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Vendor Credit</div>
                <div className="text-base font-black text-emerald-700 mt-0.5">Rs. {data.summary.totalCost.toLocaleString()}</div>
              </div>
              <div className="bg-slate-50 border border-slate-200 py-1.5 px-2 rounded">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Orders</div>
                <div className="text-base font-black text-slate-900 mt-0.5">{data.summary.totalOrders}</div>
              </div>
            </div>

            {/* Master Production Table */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <BookOpen size={14} className="text-indigo-600" />
                  1. Master Print Queue (Grouped by Course Code)
                </h3>
                <span className="text-[10px] text-slate-500 italic">Machine operators tick off jobs upon printing</span>
              </div>

              <div className="overflow-x-auto border border-slate-300 rounded">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-300 text-[9px] tracking-wider">
                    <tr>
                      <th className="py-1 px-2 text-center w-8">Done</th>
                      <th className="py-1 px-2">Course Code</th>
                      <th className="py-1 px-2">Syllabus Title</th>
                      <th className="py-1 px-2 text-center">Pages / Bk</th>
                      <th className="py-1 px-2 text-center bg-indigo-50/60 font-black text-indigo-900">Required Copies</th>
                      <th className="py-1 px-2 text-right font-black">Total Sheets</th>
                      <th className="py-1 px-2">Binding Specification</th>
                      <th className="py-1 px-2 text-right">Earning</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-mono">
                    {data.books.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-slate-500 font-sans">
                          No pending print jobs in queue for this vendor.
                        </td>
                      </tr>
                    ) : (
                      data.books.map((b: any, idx: number) => {
                        const isDone = completedBooks[b.code];
                        return (
                          <tr
                            key={idx}
                            className={`hover:bg-slate-50 transition-colors ${isDone ? "bg-emerald-50/50 line-through opacity-75" : ""}`}
                          >
                            <td className="py-1 px-1.5 text-center">
                              <button
                                type="button"
                                onClick={() => toggleBookDone(b.code)}
                                className="text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
                              >
                                {isDone ? <CheckSquare size={14} className="text-emerald-600" /> : <Square size={14} />}
                              </button>
                            </td>
                            <td className="py-1 px-2 font-bold text-slate-950 font-sans">{b.code}</td>
                            <td className="py-1 px-2 text-slate-800 font-sans font-medium">{b.title}</td>
                            <td className="py-1 px-2 text-center">{b.pages}</td>
                            <td className="py-1 px-2 text-center bg-indigo-50/60 font-black text-indigo-800">
                              {b.totalQty} {b.totalQty === 1 ? "Copy" : "Copies"}
                            </td>
                            <td className="py-1 px-2 text-right font-bold text-slate-900">{b.totalPages.toLocaleString()} pgs</td>
                            <td className="py-1 px-2 font-sans">
                              <span className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-semibold text-slate-700">
                                {b.bindingType}
                              </span>
                            </td>
                            <td className="py-1 px-2 text-right font-bold text-emerald-800 font-sans">
                              Rs. {b.totalCost.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Order Packing & Distribution Matrix */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Package size={14} className="text-indigo-600" />
                  2. Order Packing & Distribution Matrix (Order-to-Book Map)
                </h3>
                <span className="text-[10px] text-slate-500 italic">Pack books into respective student parcels</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-[11px] print-order-grid">
                {data.orders.length === 0 ? (
                  <div className="col-span-full p-4 text-center text-slate-500 font-sans border border-slate-200 rounded">
                    No active student orders associated with this batch.
                  </div>
                ) : (
                  data.orders.map((o: any, idx: number) => (
                    <div key={idx} className="bg-slate-50 border border-slate-300 rounded p-2 space-y-1 font-sans break-inside-avoid">
                      <div className="flex justify-between items-center border-b border-slate-200 pb-0.5">
                        <div>
                          <strong className="font-mono text-slate-950 font-bold">{o.reference}</strong>
                          <span className="text-slate-600 text-[10px] ml-1.5 font-medium">({o.name})</span>
                        </div>
                        <span className="px-1.5 py-0.2 bg-slate-200 text-slate-800 text-[9px] font-bold rounded uppercase">
                          {o.deliveryType === "campus" ? (o.campusName || "Campus") : o.city}
                        </span>
                      </div>

                      <div className="text-[10px] text-slate-600 truncate">
                        Phone: <span className="font-mono">{o.phone}</span> • Dest: {o.address}
                      </div>

                      <div className="bg-white border border-slate-200 rounded px-1.5 py-1 space-y-0.5 font-mono text-[10px]">
                        {o.items.map((it: any, iIdx: number) => (
                          <div key={iIdx} className="flex justify-between items-center text-slate-800">
                            <span className="font-semibold">• {it.code} (Qty: {it.quantity})</span>
                            <span className="text-[9px] text-slate-500">{it.pages} pgs</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Verification & Signoff */}
            <div className="border-t-2 border-slate-900 pt-2 mt-2 flex justify-between items-end text-[10px] font-mono break-inside-avoid">
              <div>
                <div>Operator Signature: _______________________</div>
                <div className="text-[9px] text-slate-500 mt-0.5">Printed and verified by press operator</div>
              </div>
              <div className="text-right">
                <div>Dispatch Handover Date: ___________________</div>
                <div className="text-[9px] text-slate-500 mt-0.5">Checked and signed at Bookstore Distribution Cell</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Manifest Print CSS */}
      <style>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }

          html, body {
            background: #fff !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            height: auto !important;
          }

          /* 1. HIDE ENTIRE BACKGROUND WEBSITE & PORTAL */
          body.manifest-modal-open > *:not(.manifest-modal-portal) {
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

          /* 2. MAKE PORTAL ROOT STATIC SO IT PAGINATES NATURALLY WITHOUT EXTRA PAGES */
          .manifest-modal-portal {
            display: block !important;
            position: static !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: transparent !important;
            overflow: visible !important;
          }

          .manifest-printable {
            display: block !important;
            position: static !important;
            box-shadow: none !important;
            border: none !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
          }

          /* 3. ENSURE 2-COLUMN ORDER PACKING MATRIX ON PRINT */
          .print-order-grid {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 6px !important;
          }

          /* 4. PREVENT AWKWARD PAGE BREAKS */
          tr, .break-inside-avoid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );

  return createPortal(modalContent, document.body);
}
