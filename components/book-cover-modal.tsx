"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Printer,
  Download,
  X,
  BookOpen,
  Sparkles,
  Layers,
  RefreshCw,
  FileCheck,
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
  const [variant, setVariant] = useState<number>(4); // Default to Variant 4: Classic Minimal
  const [imgLoaded, setImgLoaded] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);

  // Sync initial props when opened
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

  // Helper: Wrap text
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
  const renderVariant4 = useCallback(
    (ctx: CanvasRenderingContext2D, CX: number, cText: string, tText: string) => {
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Top Header Bracket
      ctx.fillStyle = "#475569";
      ctx.font = '700 13px "Segoe UI", Arial, sans-serif';
      ctx.fillText("— VIRTUAL UNIVERSITY OF PAKISTAN —", CX, 180);

      // Giant Crisp Code
      ctx.shadowColor = "rgba(0, 0, 0, 0.08)";
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 3;
      ctx.fillStyle = "#0A346C";
      ctx.font = '900 76px "Segoe UI", Arial, sans-serif';
      ctx.fillText(cText, CX, 248);

      ctx.shadowColor = "transparent";

      // Golden Accent Bar
      ctx.fillStyle = "#EAB308";
      roundRect(ctx, CX - 40, 280, 80, 4.5, 2.25, true, false);

      // Title (Wrapped if long)
      ctx.fillStyle = "#0F172A";
      ctx.font = '800 22px "Segoe UI", Arial, sans-serif';
      const linesCount = wrapText(ctx, tText, CX, 320, 520, 26);

      // Subtitle
      const subY = linesCount > 1 ? 356 : 350;
      ctx.fillStyle = "#0284C7";
      ctx.font = '600 14px "Segoe UI", Arial, sans-serif';
      ctx.fillText(subtitle || "Complete Course Handouts · Lectures 1 to 45", CX, subY);

      // Badge / Tagline
      const badgeY = linesCount > 1 ? 382 : 376;
      ctx.fillStyle = "#10B981";
      ctx.font = '700 12px "Segoe UI", Arial, sans-serif';
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
      const pillGrad = ctx.createLinearGradient(CX - 150, 0, CX + 150, 0);
      pillGrad.addColorStop(0, "#00A3E0");
      pillGrad.addColorStop(1, "#0D3E83");
      ctx.fillStyle = pillGrad;
      roundRect(ctx, CX - 150, 175, 300, 30, 15, true, false);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = 'bold 12px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("VIRTUAL UNIVERSITY OF PAKISTAN", CX, 190);

      // Main Code
      ctx.shadowColor = "rgba(0, 0, 0, 0.12)";
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 3;
      ctx.fillStyle = "#0D3E83";
      ctx.font = '900 68px "Segoe UI", Arial, sans-serif';
      ctx.fillText(cText, CX, 252);

      ctx.shadowColor = "transparent";

      // Gold Accent Line
      ctx.fillStyle = "#D97706";
      ctx.fillRect(CX - 80, 288, 160, 3);

      // Title
      ctx.fillStyle = "#1E293B";
      ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
      wrapText(ctx, tText, CX, 322, 520, 24);

      // Bottom Note
      ctx.fillStyle = "#0284C7";
      ctx.font = '600 13px "Segoe UI", Arial, sans-serif';
      ctx.fillText(subtitle, CX, 355);

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
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      ctx.strokeStyle = "#CBD5E1";
      ctx.lineWidth = 1.5;
      roundRect(ctx, CX - 240, 175, 480, 195, 12, true, true);

      // Ribbon text
      ctx.fillStyle = "#0A346C";
      ctx.font = '800 13px "Segoe UI", Arial, sans-serif';
      ctx.fillText("OFFICIAL VU COURSEWARE EDITION", CX, 200);

      // Code
      ctx.fillStyle = "#0072CE";
      ctx.font = '900 64px "Segoe UI", Arial, sans-serif';
      ctx.fillText(cText, CX, 250);

      // Title
      ctx.fillStyle = "#0F172A";
      ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
      wrapText(ctx, tText, CX, 305, 450, 24);

      // Decorative divider with diamond
      ctx.strokeStyle = "#94A3B8";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(CX - 120, 345);
      ctx.lineTo(CX + 120, 345);
      ctx.stroke();

      ctx.fillStyle = "#F59E0B";
      ctx.beginPath();
      ctx.moveTo(CX, 341);
      ctx.lineTo(CX + 5, 345);
      ctx.lineTo(CX, 349);
      ctx.lineTo(CX - 5, 345);
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
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 6;
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      ctx.strokeStyle = "#BAE6FD";
      ctx.lineWidth = 2;
      roundRect(ctx, CX - 260, 170, 520, 215, 16, true, true);
      ctx.shadowColor = "transparent";

      // Card Header
      ctx.fillStyle = "#0D9488";
      ctx.font = '800 12px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("DIGITAL GROWTH HUB ACADEMIC SERIES", CX, 195);

      ctx.strokeStyle = "#E0F2FE";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(CX - 200, 210);
      ctx.lineTo(CX + 200, 210);
      ctx.stroke();

      // Split Code
      const match = cText.match(/^([A-Za-z]+)(.*)$/);
      if (match && match[2]) {
        ctx.font = '900 60px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = "right";
        ctx.fillStyle = "#0D3E83";
        ctx.fillText(match[1].toUpperCase(), CX - 8, 260);

        ctx.textAlign = "left";
        ctx.fillStyle = "#059669";
        ctx.fillText(match[2], CX + 8, 260);
      } else {
        ctx.font = '900 60px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = "center";
        ctx.fillStyle = "#0D3E83";
        ctx.fillText(cText, CX, 260);
      }

      // Title
      ctx.textAlign = "center";
      ctx.fillStyle = "#1E293B";
      ctx.font = '800 19px "Segoe UI", Arial, sans-serif';
      wrapText(ctx, tText, CX, 308, 480, 22);

      // Card Feature Pill
      ctx.fillStyle = "#F0FDF4";
      ctx.strokeStyle = "#BBF7D0";
      ctx.lineWidth = 1;
      roundRect(ctx, CX - 215, 335, 430, 28, 8, true, true);

      ctx.fillStyle = "#166534";
      ctx.font = 'bold 12px "Segoe UI", Arial, sans-serif';
      ctx.fillText("✓ Mid & Finalterm Focused   |   ✓ Highlighted Handouts & Solved MCQs", CX, 349);

      ctx.restore();
    },
    []
  );

  // Redraw canvas
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 752;
    const H = 1024;
    const CX = W / 2;

    ctx.clearRect(0, 0, W, H);

    // Draw background template if loaded
    if (bgImageRef.current && bgImageRef.current.complete) {
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

  // Handle Download PNG
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const safeCode = (code || "BOOK").trim().replace(/[^a-zA-Z0-9]/g, "_").toUpperCase();
    const link = document.createElement("a");
    link.download = `${safeCode}_Title_Page_Variant_${variant}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  // Handle Print Cover (Full Page A4)
  const handlePrint = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Please allow popups to print the cover page.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${code} - Book Title Cover Page</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              background: #fff;
              width: 100vw;
              height: 100vh;
              overflow: hidden;
            }
            img {
              width: 100%;
              height: 100%;
              object-fit: contain;
            }
          </style>
        </head>
        <body>
          <img src="${dataUrl}" onload="window.print();window.close();" />
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (!mounted || !open) return null;

  const quickPresets = [
    { c: "CS101", t: "INTRODUCTION TO COMPUTING" },
    { c: "CS201", t: "PRACTICAL PROGRAMMING" },
    { c: "MTH101", t: "CALCULUS AND ANALYTICAL GEOMETRY" },
    { c: "ENG101", t: "ENGLISH COMPREHENSION" },
    { c: "PAK301", t: "PAKISTAN STUDIES" },
    { c: "MGMT627", t: "PROJECT MANAGEMENT" },
  ];

  return createPortal(
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto no-print">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[96vh] text-slate-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/60">
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
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
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

            {/* Inputs Form */}
            <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-800 space-y-3.5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Course Code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. CS101, MTH301"
                  className="w-full px-3 py-2 text-base font-black tracking-wider text-blue-300 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase"
                  maxLength={15}
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Course Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value.toUpperCase())}
                  placeholder="e.g. INTRODUCTION TO COMPUTING"
                  className="w-full px-3 py-2 text-sm font-semibold text-slate-100 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Subtitle / Edition
                </label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  placeholder="e.g. Complete Course Handouts · Lectures 1 to 45"
                  className="w-full px-3 py-1.5 text-xs text-slate-200 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Badge / Tagline
                </label>
                <input
                  type="text"
                  value={badgeText}
                  onChange={(e) => setBadgeText(e.target.value)}
                  placeholder="e.g. ★ PREPARED FOR HIGH SCORING VU STUDENTS ★"
                  className="w-full px-3 py-1.5 text-xs text-slate-200 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1.5">
                Quick Course Presets:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {quickPresets.map((p) => (
                  <button
                    key={p.c}
                    type="button"
                    onClick={() => {
                      setCode(p.c);
                      setTitle(p.t);
                    }}
                    className="px-2.5 py-1 text-xs font-mono font-bold bg-slate-800 hover:bg-blue-600/30 text-blue-300 border border-slate-700 hover:border-blue-500 rounded transition-colors cursor-pointer"
                  >
                    {p.c}
                  </button>
                ))}
              </div>
            </div>

            {/* Store Books Quick Selector (if books passed) */}
            {books && books.length > 0 && (
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Or Pick From Store Catalog:
                </label>
                <select
                  className="w-full px-2.5 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  onChange={(e) => {
                    const selected = books.find((b) => b.code === e.target.value);
                    if (selected) {
                      setCode(selected.code.toUpperCase());
                      setTitle(selected.title.toUpperCase());
                    }
                  }}
                  value=""
                >
                  <option value="" disabled>
                    -- Select a book from store --
                  </option>
                  {books.map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.code} - {b.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={handlePrint}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs md:text-sm rounded-xl shadow-lg transition-all cursor-pointer"
              >
                <Printer size={16} />
                <span>Print Cover (A4)</span>
              </button>
              <button
                type="button"
                onClick={handleDownload}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs md:text-sm rounded-xl shadow-lg transition-all cursor-pointer"
              >
                <Download size={16} />
                <span>Download PNG</span>
              </button>
            </div>
          </div>

          {/* Canvas Preview Column */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles size={14} className="text-amber-400" />
              Live Title Page Preview (752 × 1024 High-Res)
            </div>

            <div className="relative w-full max-w-[380px] sm:max-w-[420px] rounded-xl overflow-hidden shadow-2xl border-2 border-slate-700 bg-slate-950">
              <canvas
                ref={canvasRef}
                width={752}
                height={1024}
                className="w-full h-auto block"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-2 text-center">
              A4 aspect ratio · Ready for color laser printing and book binding.
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
