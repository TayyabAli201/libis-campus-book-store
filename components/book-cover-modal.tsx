"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Printer,
  Download,
  X,
  BookOpen,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

export interface BookCoverModalProps {
  open: boolean;
  onClose: () => void;
  initialCode?: string;
  initialTitle?: string;
  books?: Array<{ code: string; title: string }>;
}

export function BookCoverModal({
  open,
  onClose,
  initialCode = "CS101",
  initialTitle = "INTRODUCTION TO COMPUTING",
  books = [],
}: BookCoverModalProps) {
  const [mounted, setMounted] = useState(false);
  const [code, setCode] = useState(initialCode);
  const [title, setTitle] = useState(initialTitle);
  const [subtitle, setSubtitle] = useState("Complete Course Handouts · Lectures 1 to 45");
  const [badgeText, setBadgeText] = useState("★ PREPARED FOR HIGH SCORING VU STUDENTS ★");
  const [variant, setVariant] = useState<number>(4); // Default: Variant 4: Classic Minimal
  const [safeMargin, setSafeMargin] = useState<boolean>(true); // Default safe margin prevents printer cutoff
  const [imgLoaded, setImgLoaded] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);

  // Sync initial props when modal is opened
  useEffect(() => {
    if (open) {
      if (initialCode) setCode(initialCode.toUpperCase());
      if (initialTitle) setTitle(initialTitle.toUpperCase());
    }
  }, [open, initialCode, initialTitle]);

  useEffect(() => {
    setMounted(true);
    // Preload template image
    const img = new Image();
    img.src = "/vu-book-cover-template.jpg";
    img.onload = () => {
      bgImageRef.current = img;
      setImgLoaded(true);
    };
    img.onerror = () => {
      console.warn("Could not load /vu-book-cover-template.jpg");
    };

    return () => {
      setMounted(false);
    };
  }, []);

  // Helper: Draw rounded rectangle
  const roundRect = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    fill: boolean,
    stroke: boolean
  ) => {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  };

  // Helper: Wrap text cleanly
  const wrapText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ) => {
    const words = text.split(" ");
    let line = "";
    const lines: string[] = [];

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        lines.push(line.trim());
        line = words[n] + " ";
      } else {
        line = testLine;
      }
    }
    lines.push(line.trim());

    // Render centered lines
    const startY = y - ((lines.length - 1) * lineHeight) / 2;
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], x, startY + i * lineHeight);
    }
    return lines.length;
  };

  // Render Variant 4: Minimalist Classic Typography (Requested Default)
  // High-Res A4 Canvas Coordinates (Width: 1240, Height: 1754, CX: 620)
  const renderVariant4 = useCallback(
    (ctx: CanvasRenderingContext2D, CX: number, cText: string, tText: string) => {
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Top Header Bracket
      ctx.fillStyle = "#475569";
      ctx.font = '700 20px "Segoe UI", Arial, sans-serif';
      ctx.fillText("— VIRTUAL UNIVERSITY OF PAKISTAN —", CX, 300);

      // Giant Crisp Code
      ctx.shadowColor = "rgba(0, 0, 0, 0.08)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 5;
      ctx.fillStyle = "#0A346C";
      ctx.font = '900 120px "Segoe UI", Arial, sans-serif';
      ctx.fillText(cText, CX, 415);

      ctx.shadowColor = "transparent";

      // Golden Accent Bar
      ctx.fillStyle = "#EAB308";
      roundRect(ctx, CX - 65, 470, 130, 8, 4, true, false);

      // Title (Wrapped if long)
      ctx.fillStyle = "#0F172A";
      ctx.font = '800 34px "Segoe UI", Arial, sans-serif';
      const linesCount = wrapText(ctx, tText, CX, 540, 880, 44);

      // Subtitle
      const subY = linesCount > 1 ? 610 : 595;
      ctx.fillStyle = "#0284C7";
      ctx.font = '600 23px "Segoe UI", Arial, sans-serif';
      ctx.fillText(subtitle || "Complete Course Handouts · Lectures 1 to 45", CX, subY);

      // Badge / Tagline
      const badgeY = linesCount > 1 ? 655 : 640;
      ctx.fillStyle = "#10B981";
      ctx.font = '700 19px "Segoe UI", Arial, sans-serif';
      ctx.fillText(badgeText || "★ PREPARED FOR HIGH SCORING VU STUDENTS ★", CX, badgeY);

      ctx.restore();
    },
    [subtitle, badgeText]
  );

  // Render Variant 1: Royal Pill & Badge
  const renderVariant1 = useCallback(
    (ctx: CanvasRenderingContext2D, CX: number, cText: string, tText: string) => {
      ctx.save();

      // Top Badge Pill
      const pillGrad = ctx.createLinearGradient(CX - 250, 0, CX + 250, 0);
      pillGrad.addColorStop(0, "#00A3E0");
      pillGrad.addColorStop(1, "#0D3E83");
      ctx.fillStyle = pillGrad;
      roundRect(ctx, CX - 250, 280, 500, 50, 25, true, false);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("VIRTUAL UNIVERSITY OF PAKISTAN", CX, 305);

      // Main Code
      ctx.shadowColor = "rgba(0, 0, 0, 0.12)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 5;
      ctx.fillStyle = "#0D3E83";
      ctx.font = '900 110px "Segoe UI", Arial, sans-serif';
      ctx.fillText(cText, CX, 415);

      ctx.shadowColor = "transparent";

      // Gold Accent Line
      ctx.fillStyle = "#D97706";
      ctx.fillRect(CX - 130, 475, 260, 5);

      // Title
      ctx.fillStyle = "#1E293B";
      ctx.font = 'bold 32px "Segoe UI", Arial, sans-serif';
      wrapText(ctx, tText, CX, 535, 860, 40);

      // Bottom Note
      ctx.fillStyle = "#0284C7";
      ctx.font = '600 22px "Segoe UI", Arial, sans-serif';
      ctx.fillText(subtitle, CX, 595);

      ctx.restore();
    },
    [subtitle]
  );

  // Render Variant 2: Executive Ribbon
  const renderVariant2 = useCallback(
    (ctx: CanvasRenderingContext2D, CX: number, cText: string, tText: string) => {
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Subtle Banner
      ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
      ctx.strokeStyle = "#CBD5E1";
      ctx.lineWidth = 2.5;
      roundRect(ctx, CX - 400, 280, 800, 320, 20, true, true);

      // Ribbon text
      ctx.fillStyle = "#0A346C";
      ctx.font = '800 22px "Segoe UI", Arial, sans-serif';
      ctx.fillText("OFFICIAL VU COURSEWARE EDITION", CX, 320);

      // Code
      ctx.fillStyle = "#0072CE";
      ctx.font = '900 105px "Segoe UI", Arial, sans-serif';
      ctx.fillText(cText, CX, 410);

      // Title
      ctx.fillStyle = "#0F172A";
      ctx.font = 'bold 32px "Segoe UI", Arial, sans-serif';
      wrapText(ctx, tText, CX, 505, 750, 38);

      // Decorative divider with diamond
      ctx.strokeStyle = "#94A3B8";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(CX - 200, 565);
      ctx.lineTo(CX + 200, 565);
      ctx.stroke();

      ctx.fillStyle = "#F59E0B";
      ctx.beginPath();
      ctx.moveTo(CX, 558);
      ctx.lineTo(CX + 8, 565);
      ctx.lineTo(CX, 572);
      ctx.lineTo(CX - 8, 565);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    },
    []
  );

  // Render Variant 3: Dual-Tone Card
  const renderVariant3 = useCallback(
    (ctx: CanvasRenderingContext2D, CX: number, cText: string, tText: string) => {
      ctx.save();

      // Card Box
      ctx.shadowColor = "rgba(2, 132, 199, 0.15)";
      ctx.shadowBlur = 20;
      ctx.shadowOffsetY = 10;
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      ctx.strokeStyle = "#BAE6FD";
      ctx.lineWidth = 3;
      roundRect(ctx, CX - 430, 280, 860, 350, 25, true, true);
      ctx.shadowColor = "transparent";

      // Card Header
      ctx.fillStyle = "#0D9488";
      ctx.font = '800 20px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("DIGITAL GROWTH HUB ACADEMIC SERIES", CX, 320);

      ctx.strokeStyle = "#E0F2FE";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(CX - 330, 345);
      ctx.lineTo(CX + 330, 345);
      ctx.stroke();

      // Split Code
      const match = cText.match(/^([A-Za-z]+)(.*)$/);
      if (match && match[2]) {
        ctx.font = '900 100px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = "right";
        ctx.fillStyle = "#0D3E83";
        ctx.fillText(match[1].toUpperCase(), CX - 12, 425);

        ctx.textAlign = "left";
        ctx.fillStyle = "#059669";
        ctx.fillText(match[2], CX + 12, 425);
      } else {
        ctx.font = '900 100px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = "center";
        ctx.fillStyle = "#0D3E83";
        ctx.fillText(cText, CX, 425);
      }

      // Title
      ctx.textAlign = "center";
      ctx.fillStyle = "#1E293B";
      ctx.font = '800 30px "Segoe UI", Arial, sans-serif';
      wrapText(ctx, tText, CX, 505, 800, 36);

      // Card Feature Pill
      ctx.fillStyle = "#F0FDF4";
      ctx.strokeStyle = "#BBF7D0";
      ctx.lineWidth = 1.5;
      roundRect(ctx, CX - 350, 560, 700, 46, 14, true, true);

      ctx.fillStyle = "#166534";
      ctx.font = 'bold 19px "Segoe UI", Arial, sans-serif';
      ctx.fillText("✓ Mid & Finalterm Focused   |   ✓ Highlighted Handouts & Solved MCQs", CX, 583);

      ctx.restore();
    },
    []
  );

  // Redraw canvas with exact A4 proportions (Width: 1240, Height: 1754 -> 210 x 297 mm)
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Standard A4 at 150 DPI: 1240 x 1754 (Ratio 210 / 297 = 0.707)
    const W = 1240;
    const H = 1754;
    const CX = W / 2;

    ctx.clearRect(0, 0, W, H);

    // Draw background template
    if (bgImageRef.current && bgImageRef.current.complete) {
      // Draw template to completely fit A4 page
      ctx.drawImage(bgImageRef.current, 0, 0, W, H);
    } else {
      // Elegant placeholder gradient while image loads
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, "#0F2B48");
      grad.addColorStop(0.35, "#173B63");
      grad.addColorStop(1, "#0A192F");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);
    }

    const cText = (code || "CS101").trim().toUpperCase();
    const tText = (title || "COURSE TITLE").trim().toUpperCase();

    if (variant === 1) renderVariant1(ctx, CX, cText, tText);
    else if (variant === 2) renderVariant2(ctx, CX, cText, tText);
    else if (variant === 3) renderVariant3(ctx, CX, cText, tText);
    else renderVariant4(ctx, CX, cText, tText);
  }, [code, title, variant, renderVariant1, renderVariant2, renderVariant3, renderVariant4]);

  // Re-render when inputs or image load change
  useEffect(() => {
    if (open) {
      renderCanvas();
    }
  }, [open, imgLoaded, renderCanvas]);

  // Handle Download High-Res PNG (1240 x 1754 A4)
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const safeCode = (code || "BOOK").trim().replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();
    const link = document.createElement("a");
    link.download = `${safeCode}_Title_Cover_A4.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  // Handle Print Cover (Full Page A4: 210 × 297 mm with anti-crop safe margin)
  const handlePrint = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to print the cover page.");
      return;
    }

    const printPadding = safeMargin ? "4mm" : "0mm";

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${code} - A4 Book Title Cover Page (210 × 297 mm)</title>
          <style>
            @page {
              size: 210mm 297mm;
              margin: 0;
            }
            * {
              box-sizing: border-box;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              width: 210mm !important;
              height: 297mm !important;
              overflow: hidden !important;
            }
            .a4-sheet {
              width: 210mm !important;
              height: 297mm !important;
              max-width: 210mm !important;
              max-height: 297mm !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              padding: ${printPadding} !important;
              page-break-after: avoid !important;
              page-break-inside: avoid !important;
            }
            .a4-sheet img {
              max-width: 100% !important;
              max-height: 100% !important;
              width: 100% !important;
              height: 100% !important;
              object-fit: contain !important;
              display: block !important;
            }
          </style>
        </head>
        <body>
          <div class="a4-sheet">
            <img src="${dataUrl}" onload="window.print();window.close();" />
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto no-print">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[96vh] text-slate-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <BookOpen size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base md:text-lg flex items-center gap-2">
                Book Title & Cover Page Studio
                <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-medium">
                  Variant 4: Classic Minimal
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                  A4: 210 × 297 mm
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Generate high-resolution printable title covers for VU academic book binding.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Controls Column */}
          <div className="lg:col-span-5 space-y-4">
            {/* Style Variant Selector */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Cover Style Variant
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 4, name: "Variant 4: Classic Minimal (Recommended)" },
                  { id: 1, name: "Variant 1: Royal Pill" },
                  { id: 2, name: "Variant 2: Executive Ribbon" },
                  { id: 3, name: "Variant 3: Dual-Tone Card" },
                ].map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setVariant(v.id)}
                    className={`px-3 py-2 text-xs font-bold rounded-lg border text-left transition-all cursor-pointer ${
                      variant === v.id
                        ? "bg-blue-600 text-white border-blue-500 shadow-md ring-1 ring-blue-400"
                        : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-750 hover:text-white"
                    }`}
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Inputs Form with Explicit High-Contrast Text Styling */}
            <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-blue-300 mb-1">
                  Course Code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. CS101, BIF401"
                  style={{
                    backgroundColor: "#0f172a",
                    color: "#38bdf8",
                    borderColor: "#334155",
                    outline: "none",
                  }}
                  className="w-full px-3 py-2 text-base font-black tracking-wider border rounded-lg font-mono uppercase focus:ring-2 focus:ring-blue-500"
                  maxLength={15}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Course Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value.toUpperCase())}
                  placeholder="e.g. INTRODUCTION TO COMPUTING"
                  style={{
                    backgroundColor: "#0f172a",
                    color: "#ffffff",
                    borderColor: "#334155",
                    outline: "none",
                  }}
                  className="w-full px-3 py-2 text-sm font-bold border rounded-lg uppercase focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Subtitle / Edition
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="e.g. Complete Course Handouts · Lectures 1 to 45"
                  style={{
                    backgroundColor: "#0f172a",
                    color: "#93c5fd",
                    borderColor: "#334155",
                    outline: "none",
                  }}
                  className="w-full px-3 py-2 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">
                  Badge / Tagline
                </label>
                <input
                  type="text"
                  value={badgeText}
                  onChange={(e) => setBadgeText(e.target.value)}
                  placeholder="e.g. ★ PREPARED FOR HIGH SCORING VU STUDENTS ★"
                  style={{
                    backgroundColor: "#0f172a",
                    color: "#34d399",
                    borderColor: "#334155",
                    outline: "none",
                  }}
                  className="w-full px-3 py-2 text-xs font-bold border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Store Catalog Quick Selector */}
            {books && books.length > 0 && (
              <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-1.5">
                  <BookOpen size={14} className="text-blue-400" />
                  Select Book From Bookstore Catalog:
                </label>
                <select
                  style={{
                    backgroundColor: "#0f172a",
                    color: "#ffffff",
                    borderColor: "#334155",
                  }}
                  className="w-full px-3 py-2 text-xs border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  onChange={(e) => {
                    const selected = books.find((b) => b.code === e.target.value);
                    if (selected) {
                      setCode(selected.code.toUpperCase());
                      setTitle(selected.title.toUpperCase());
                    }
                  }}
                  value={books.some((b) => b.code === code) ? code : ""}
                >
                  <option value="" disabled>
                    -- Select a book to auto-fill --
                  </option>
                  {books.map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.code} — {b.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* A4 Safe Margin Protection Toggle */}
            <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={18} className={safeMargin ? "text-emerald-400" : "text-slate-500"} />
                <div>
                  <div className="text-xs font-bold text-slate-200">
                    A4 Safe Margins (No Cutoff)
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Prevents printer rollers from cutting off side logos & text
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSafeMargin(!safeMargin)}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  safeMargin
                    ? "bg-emerald-600/30 text-emerald-300 border-emerald-500/50"
                    : "bg-slate-800 text-slate-400 border-slate-700"
                }`}
              >
                {safeMargin ? "Enabled (4mm)" : "Borderless (0mm)"}
              </button>
            </div>

            {/* Actions */}
            <div className="pt-1 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={handlePrint}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs md:text-sm rounded-xl shadow-lg transition-all cursor-pointer"
              >
                <Printer size={16} />
                <span>Print Cover (A4 - 210×297mm)</span>
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs md:text-sm rounded-xl shadow-lg transition-all cursor-pointer"
              >
                <Download size={16} />
                <span>Download A4 PNG</span>
              </button>
            </div>
          </div>

          {/* Canvas Preview Column */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-400" />
              Live A4 Preview (210 × 297 mm · 1240 × 1754 High-Res)
            </div>

            <div className="relative w-full max-w-[380px] sm:max-w-[430px] rounded-xl overflow-hidden shadow-2xl border-2 border-slate-700 bg-slate-950">
              <canvas
                ref={canvasRef}
                width={1240}
                height={1754}
                className="w-full h-auto block"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-2 text-center">
              True A4 aspect ratio (210 × 297 mm) · Exact fit for color laser printing and book binding.
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
