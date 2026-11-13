"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Printer,
  Download,
  X,
  BookOpen,
  Sparkles,
  Upload,
  RotateCcw,
  Image as ImageIcon,
  MoveVertical,
  Type,
  Save,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "./shared";

export interface BookCoverModalProps {
  open: boolean;
  onClose: () => void;
  initialCode?: string;
  initialTitle?: string;
  books?: Array<{ code: string; title: string }>;
  isAdmin?: boolean;
}

export function BookCoverModal({
  open,
  onClose,
  initialCode = "CS101",
  initialTitle = "INTRODUCTION TO COMPUTING",
  books = [],
  isAdmin = false,
}: BookCoverModalProps) {
  const [mounted, setMounted] = useState(false);
  const [code, setCode] = useState(initialCode);
  const [title, setTitle] = useState(initialTitle);
  const [subtitle, setSubtitle] = useState("Complete Course Handouts · Lectures 1 to 45");
  const [badgeText, setBadgeText] = useState("★ PREPARED FOR HIGH SCORING VU STUDENTS ★");
  const [variant, setVariant] = useState<number>(4); // Default: Variant 4: Classic Minimal
  const [customTemplateActive, setCustomTemplateActive] = useState<boolean>(false);
  const [customTemplateUrl, setCustomTemplateUrl] = useState<string | null>(null);
  const [yOffset, setYOffset] = useState<number>(0);
  const [codeFontSize, setCodeFontSize] = useState<number>(120);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [catalogBooks, setCatalogBooks] = useState<Array<{ code: string; title: string }>>(books || []);
  const [savingGlobal, setSavingGlobal] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync initial props when modal is opened
  useEffect(() => {
    if (open) {
      if (initialCode) setCode(initialCode.toUpperCase());
      if (initialTitle) setTitle(initialTitle.toUpperCase());
    }
  }, [open, initialCode, initialTitle]);

  // Load catalog books if not passed or empty
  useEffect(() => {
    if (books && books.length > 0) {
      setCatalogBooks(books);
    } else if (open) {
      fetch("/api/catalog?pageSize=500")
        .then((res) => res.json())
        .then((data: any) => {
          if (data && Array.isArray(data.books) && data.books.length > 0) {
            const mapped = data.books
              .map((b: any) => ({
                code: (b.code || b.course_code || "").trim().toUpperCase(),
                title: (b.title || b.course_name || "").trim().toUpperCase(),
              }))
              .filter((b: any) => Boolean(b.code));
            setCatalogBooks(mapped);
          }
        })
        .catch((err) => console.warn("Failed to load catalog books for Cover Studio", err));
    }
  }, [open, books]);

  // Load server-persisted template and layout settings
  useEffect(() => {
    setMounted(true);

    const initSettings = async () => {
      let serverSettingsLoaded = false;
      try {
        const res = await fetch("/api/catalog");
        if (res.ok) {
          const data: any = await res.json();
          const s = data?.settings;
          if (s) {
            serverSettingsLoaded = true;
            if (s.cover_template_url) {
              setCustomTemplateUrl(s.cover_template_url);
              setCustomTemplateActive(true);
              const img = new Image();
              img.onload = () => {
                bgImageRef.current = img;
                setImgLoaded(true);
              };
              img.src = s.cover_template_url;
            }
            if (typeof s.cover_y_offset === "number") setYOffset(s.cover_y_offset);
            if (typeof s.cover_code_size === "number") setCodeFontSize(s.cover_code_size);
            if (typeof s.cover_variant === "number") setVariant(s.cover_variant);
            if (s.cover_subtitle) setSubtitle(s.cover_subtitle);
            if (s.cover_badge_text) setBadgeText(s.cover_badge_text);
          }
        }
      } catch (err) {
        console.warn("Could not fetch server cover settings, fallback to local/default", err);
      }

      if (!serverSettingsLoaded) {
        // Fallback to local storage or official VU template
        try {
          const savedY = localStorage.getItem("vu_book_cover_y_offset");
          if (savedY !== null) setYOffset(Number(savedY) || 0);

          const savedSize = localStorage.getItem("vu_book_cover_code_size");
          if (savedSize !== null) setCodeFontSize(Number(savedSize) || 120);

          const savedCustom = localStorage.getItem("vu_book_cover_custom_template");
          const img = new Image();
          if (savedCustom) {
            img.src = savedCustom;
            setCustomTemplateActive(true);
            setCustomTemplateUrl(savedCustom);
          } else {
            img.src = "/vu-book-cover-template.jpg";
            setCustomTemplateActive(false);
          }
          img.onload = () => {
            bgImageRef.current = img;
            setImgLoaded(true);
          };
          img.onerror = () => {
            const fallback = new Image();
            fallback.src = "/vu-book-cover-template.jpg";
            fallback.onload = () => {
              bgImageRef.current = fallback;
              setImgLoaded(true);
            };
          };
        } catch {
          const fallback = new Image();
          fallback.src = "/vu-book-cover-template.jpg";
          fallback.onload = () => {
            bgImageRef.current = fallback;
            setImgLoaded(true);
          };
        }
      } else if (!bgImageRef.current) {
        // Load default if no custom template was set on server
        const img = new Image();
        img.onload = () => {
          bgImageRef.current = img;
          setImgLoaded(true);
        };
        img.src = "/vu-book-cover-template.jpg";
      }
    };

    initSettings();

    return () => {
      setMounted(false);
    };
  }, []);

  // Save Y-Offset
  const handleYOffsetChange = (val: number) => {
    setYOffset(val);
    try {
      localStorage.setItem("vu_book_cover_y_offset", String(val));
    } catch {}
  };

  // Save Code Font Size
  const handleCodeSizeChange = (val: number) => {
    setCodeFontSize(val);
    try {
      localStorage.setItem("vu_book_cover_code_size", String(val));
    } catch {}
  };

  // Handle Custom Template Upload (PNG/JPG) - Admin Only
  const handleCustomTemplateUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isAdmin) return;
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawData = event.target?.result as string;
      if (!rawData) return;

      const tempImg = new Image();
      tempImg.onload = () => {
        // Normalize to true A4 150 DPI dimensions (1240 x 1754)
        const offCanvas = document.createElement("canvas");
        offCanvas.width = 1240;
        offCanvas.height = 1754;
        const offCtx = offCanvas.getContext("2d");
        if (offCtx) {
          offCtx.drawImage(tempImg, 0, 0, 1240, 1754);
          const normalizedDataUrl = offCanvas.toDataURL("image/jpeg", 0.92);

          const newImg = new Image();
          newImg.onload = () => {
            bgImageRef.current = newImg;
            setCustomTemplateActive(true);
            setCustomTemplateUrl(normalizedDataUrl);
            setImgLoaded((prev) => !prev);
          };
          newImg.src = normalizedDataUrl;

          try {
            localStorage.setItem("vu_book_cover_custom_template", normalizedDataUrl);
          } catch {}
        }
      };
      tempImg.src = rawData;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // Reset to Default Official VU Template - Admin Only
  const handleResetTemplate = () => {
    if (!isAdmin) return;
    try {
      localStorage.removeItem("vu_book_cover_custom_template");
    } catch {}
    setUploadedFile(null);
    setCustomTemplateUrl(null);
    const img = new Image();
    img.onload = () => {
      bgImageRef.current = img;
      setCustomTemplateActive(false);
      setImgLoaded((prev) => !prev);
    };
    img.src = "/vu-book-cover-template.jpg";
    toast.info("Reset to official default template. Click 'Save Global Default' to make it permanent for all vendors.");
  };

  // Save Settings as Global Default for All Vendors - Admin Only
  const handleSaveGlobalDefault = async () => {
    if (!isAdmin) return;
    setSavingGlobal(true);
    try {
      let finalUrl = customTemplateUrl;

      // If a local image file was uploaded, upload it to the server's bucket with X-Requested-With header
      if (uploadedFile) {
        const coverRes = await fetch("/api/covers", {
          method: "POST",
          body: uploadedFile,
          headers: {
            "Content-Type": uploadedFile.type,
            "X-Requested-With": "CampusBookstore",
          },
        });
        if (!coverRes.ok) {
          const errData: any = await coverRes.json().catch(() => ({}));
          throw new Error(errData?.error || "Failed to upload cover template image.");
        }
        const coverData: any = await coverRes.json();
        if (coverData?.url) {
          finalUrl = coverData.url;
          setCustomTemplateUrl(coverData.url);
        }
      }

      // Fetch current settings & version using official api() helper
      const settingsData: any = await api("manage/settings");
      const curSettings = settingsData.settings;
      const version = settingsData.version;

      const updatedSettings = {
        ...curSettings,
        cover_template_url: customTemplateActive ? (finalUrl || null) : null,
        cover_y_offset: yOffset,
        cover_code_size: codeFontSize,
        cover_variant: variant,
        cover_subtitle: subtitle,
        cover_badge_text: badgeText,
      };

      // Save settings using api() helper (properly includes X-Requested-With and passes CSRF)
      await api("manage/settings", { settings: updatedSettings, version });

      setUploadedFile(null);
      toast.success("Cover template, alignment, subtitle & tagline saved as global default for all vendors!");
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error(err?.message || "Failed to save global template");
    } finally {
      setSavingGlobal(false);
    }
  };

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
  const renderVariant4 = useCallback(
    (ctx: CanvasRenderingContext2D, CX: number, cText: string, tText: string) => {
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Top Header Bracket
      ctx.fillStyle = "#475569";
      ctx.font = '700 20px "Segoe UI", Arial, sans-serif';
      ctx.fillText("— VIRTUAL UNIVERSITY OF PAKISTAN —", CX, 300 + yOffset);

      // Giant Crisp Code
      ctx.shadowColor = "rgba(0, 0, 0, 0.08)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 5;
      ctx.fillStyle = "#0A346C";
      ctx.font = `900 ${codeFontSize}px "Segoe UI", Arial, sans-serif`;
      ctx.fillText(cText, CX, 415 + yOffset);

      ctx.shadowColor = "transparent";

      // Golden Accent Bar
      ctx.fillStyle = "#EAB308";
      roundRect(ctx, CX - 65, 470 + yOffset, 130, 8, 4, true, false);

      // Title (Wrapped if long)
      ctx.fillStyle = "#0F172A";
      ctx.font = '800 34px "Segoe UI", Arial, sans-serif';
      const linesCount = wrapText(ctx, tText, CX, 540 + yOffset, 880, 44);

      // Subtitle
      const subY = (linesCount > 1 ? 610 : 595) + yOffset;
      ctx.fillStyle = "#0284C7";
      ctx.font = '600 23px "Segoe UI", Arial, sans-serif';
      ctx.fillText(subtitle || "Complete Course Handouts · Lectures 1 to 45", CX, subY);

      // Badge / Tagline
      const badgeY = (linesCount > 1 ? 655 : 640) + yOffset;
      ctx.fillStyle = "#10B981";
      ctx.font = '700 19px "Segoe UI", Arial, sans-serif';
      ctx.fillText(badgeText || "★ PREPARED FOR HIGH SCORING VU STUDENTS ★", CX, badgeY);

      ctx.restore();
    },
    [subtitle, badgeText, yOffset, codeFontSize]
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
      roundRect(ctx, CX - 250, 280 + yOffset, 500, 50, 25, true, false);

      ctx.fillStyle = "#FFFFFF";
      ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("VIRTUAL UNIVERSITY OF PAKISTAN", CX, 305 + yOffset);

      // Main Code
      ctx.shadowColor = "rgba(0, 0, 0, 0.12)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 5;
      ctx.fillStyle = "#0D3E83";
      ctx.font = `900 ${Math.round(codeFontSize * 0.92)}px "Segoe UI", Arial, sans-serif`;
      ctx.fillText(cText, CX, 415 + yOffset);

      ctx.shadowColor = "transparent";

      // Gold Accent Line
      ctx.fillStyle = "#D97706";
      ctx.fillRect(CX - 130, 475 + yOffset, 260, 5);

      // Title
      ctx.fillStyle = "#1E293B";
      ctx.font = 'bold 32px "Segoe UI", Arial, sans-serif';
      wrapText(ctx, tText, CX, 535 + yOffset, 860, 40);

      // Bottom Note
      ctx.fillStyle = "#0284C7";
      ctx.font = '600 22px "Segoe UI", Arial, sans-serif';
      ctx.fillText(subtitle, CX, 595 + yOffset);

      ctx.restore();
    },
    [subtitle, yOffset, codeFontSize]
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
      roundRect(ctx, CX - 400, 280 + yOffset, 800, 320, 20, true, true);

      // Ribbon text
      ctx.fillStyle = "#0A346C";
      ctx.font = '800 22px "Segoe UI", Arial, sans-serif';
      ctx.fillText("OFFICIAL VU COURSEWARE EDITION", CX, 320 + yOffset);

      // Code
      ctx.fillStyle = "#0072CE";
      ctx.font = `900 ${Math.round(codeFontSize * 0.88)}px "Segoe UI", Arial, sans-serif`;
      ctx.fillText(cText, CX, 410 + yOffset);

      // Title
      ctx.fillStyle = "#0F172A";
      ctx.font = 'bold 32px "Segoe UI", Arial, sans-serif';
      wrapText(ctx, tText, CX, 505 + yOffset, 750, 38);

      // Decorative divider with diamond
      ctx.strokeStyle = "#94A3B8";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(CX - 200, 565 + yOffset);
      ctx.lineTo(CX + 200, 565 + yOffset);
      ctx.stroke();

      ctx.fillStyle = "#F59E0B";
      ctx.beginPath();
      ctx.moveTo(CX, 558 + yOffset);
      ctx.lineTo(CX + 8, 565 + yOffset);
      ctx.lineTo(CX, 572 + yOffset);
      ctx.lineTo(CX - 8, 565 + yOffset);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    },
    [yOffset, codeFontSize]
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
      roundRect(ctx, CX - 430, 280 + yOffset, 860, 350, 25, true, true);
      ctx.shadowColor = "transparent";

      // Card Header
      ctx.fillStyle = "#0D9488";
      ctx.font = '800 20px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("DIGITAL GROWTH HUB ACADEMIC SERIES", CX, 320 + yOffset);

      ctx.strokeStyle = "#E0F2FE";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(CX - 330, 345 + yOffset);
      ctx.lineTo(CX + 330, 345 + yOffset);
      ctx.stroke();

      // Split Code
      const match = cText.match(/^([A-Za-z]+)(.*)$/);
      const size = Math.round(codeFontSize * 0.85);
      if (match && match[2]) {
        ctx.font = `900 ${size}px "Segoe UI", Arial, sans-serif`;
        ctx.textAlign = "right";
        ctx.fillStyle = "#0D3E83";
        ctx.fillText(match[1].toUpperCase(), CX - 12, 425 + yOffset);

        ctx.textAlign = "left";
        ctx.fillStyle = "#059669";
        ctx.fillText(match[2], CX + 12, 425 + yOffset);
      } else {
        ctx.font = `900 ${size}px "Segoe UI", Arial, sans-serif`;
        ctx.textAlign = "center";
        ctx.fillStyle = "#0D3E83";
        ctx.fillText(cText, CX, 425 + yOffset);
      }

      // Title
      ctx.textAlign = "center";
      ctx.fillStyle = "#1E293B";
      ctx.font = '800 30px "Segoe UI", Arial, sans-serif';
      wrapText(ctx, tText, CX, 505 + yOffset, 800, 36);

      // Card Feature Pill
      ctx.fillStyle = "#F0FDF4";
      ctx.strokeStyle = "#BBF7D0";
      ctx.lineWidth = 1.5;
      roundRect(ctx, CX - 350, 560 + yOffset, 700, 46, 14, true, true);

      ctx.fillStyle = "#166534";
      ctx.font = 'bold 19px "Segoe UI", Arial, sans-serif';
      ctx.fillText("✓ Mid & Finalterm Focused   |   ✓ Highlighted Handouts & Solved MCQs", CX, 583 + yOffset);

      ctx.restore();
    },
    [yOffset, codeFontSize]
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

  // Handle Print Cover (Full Page 100% Borderless A4: 210 × 297 mm)
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
          <title>${code} - A4 Book Title Cover Page (210 × 297 mm)</title>
          <style>
            @page {
              size: 210mm 297mm;
              margin: 0;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
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
              margin: 0 !important;
              padding: 0 !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              page-break-after: avoid !important;
              page-break-inside: avoid !important;
            }
            .a4-sheet img {
              width: 210mm !important;
              height: 297mm !important;
              max-width: 100% !important;
              max-height: 100% !important;
              object-fit: fill !important;
              display: block !important;
              margin: 0 !important;
              padding: 0 !important;
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
                <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                  isAdmin
                    ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                    : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                }`}>
                  {isAdmin ? "👑 Admin Master Mode" : "Vendor Print Studio"}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                  A4 Borderless
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {isAdmin
                  ? "Configure master cover background, alignment, subtitle & tagline for all vendors."
                  : "Select any book from bookstore catalog to print high-resolution title cover."}
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

            {/* ADMIN ONLY: Style Variant Selector */}
            {isAdmin && (
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
                  <span>Cover Style Variant</span>
                  <span className="text-[10px] text-purple-400 font-mono">Admin Control</span>
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
            )}

            {/* ADMIN ONLY: Custom Background Template & Positioning Card */}
            {isAdmin && (
              <div className="bg-slate-950/70 p-3.5 rounded-xl border border-purple-500/30 space-y-3 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ImageIcon size={16} className={customTemplateActive ? "text-emerald-400" : "text-blue-400"} />
                    <div>
                      <div className="text-xs font-bold text-slate-200">
                        Cover Background Template
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {customTemplateActive ? "🟢 Custom Template Active" : "🔷 Official VU Default Template"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      onChange={handleCustomTemplateUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-2.5 py-1 text-xs font-bold rounded-lg border bg-blue-600 hover:bg-blue-500 text-white border-blue-400 flex items-center gap-1.5 transition-all cursor-pointer shadow"
                      title="Upload your own custom A4 template image (PNG or JPG)"
                    >
                      <Upload size={12} />
                      <span>Upload Template</span>
                    </button>

                    {customTemplateActive && (
                      <button
                        type="button"
                        onClick={handleResetTemplate}
                        className="px-2 py-1 text-xs font-bold rounded-lg border bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700 flex items-center gap-1 transition-all cursor-pointer"
                        title="Reset to default official VU template"
                      >
                        <RotateCcw size={12} />
                        <span>Reset</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Text Alignment Sliders */}
                <div className="pt-2 border-t border-slate-800/80 space-y-2.5">
                  {/* Y Offset Slider */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-300 flex items-center gap-1">
                        <MoveVertical size={13} className="text-amber-400" />
                        Text Vertical Position (Y-Offset):
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-amber-300">
                          {yOffset > 0 ? `+${yOffset}px` : `${yOffset}px`}
                        </span>
                        {yOffset !== 0 && (
                          <button
                            type="button"
                            onClick={() => handleYOffsetChange(0)}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
                          >
                            Reset 0
                          </button>
                        )}
                      </div>
                    </div>
                    <input
                      type="range"
                      min={-180}
                      max={180}
                      step={5}
                      value={yOffset}
                      onChange={(e) => handleYOffsetChange(Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                      <span>▲ Move Up (-180px)</span>
                      <span>Center (0)</span>
                      <span>▼ Move Down (+180px)</span>
                    </div>
                  </div>

                  {/* Course Code Font Size Slider */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-300 flex items-center gap-1">
                        <Type size={13} className="text-cyan-400" />
                        Course Code Font Size:
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-cyan-300">
                          {codeFontSize}px
                        </span>
                        {codeFontSize !== 120 && (
                          <button
                            type="button"
                            onClick={() => handleCodeSizeChange(120)}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
                          >
                            Reset 120
                          </button>
                        )}
                      </div>
                    </div>
                    <input
                      type="range"
                      min={70}
                      max={150}
                      step={2}
                      value={codeFontSize}
                      onChange={(e) => handleCodeSizeChange(Number(e.target.value))}
                      className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
                    />
                  </div>

                  {/* Global Server Save Button */}
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={savingGlobal}
                      onClick={handleSaveGlobalDefault}
                      className="w-full py-2.5 px-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer shadow"
                    >
                      <Save size={14} />
                      <span>{savingGlobal ? "Saving to server..." : "Save As Global Default For All Vendors"}</span>
                    </button>
                    <p className="text-[10px] text-slate-400 mt-1 text-center">
                      Saves template, alignment, subtitle & tagline to server database so all vendors automatically inherit it.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ALWAYS VISIBLE: Store Catalog Dropdown (User Highlighted Feature) */}
            {catalogBooks && catalogBooks.length > 0 && (
              <div className="bg-slate-950/60 p-3 rounded-xl border border-sky-500/40 shadow-md">
                <label className="block text-xs font-bold uppercase tracking-wider text-sky-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <BookOpen size={14} className="text-sky-400" />
                    Select Book From Bookstore Catalog:
                  </span>
                  <span className="text-[10px] font-mono text-sky-400/80 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800">
                    {catalogBooks.length} Books Available
                  </span>
                </label>
                <select
                  style={{
                    backgroundColor: "#0f172a",
                    color: "#ffffff",
                    borderColor: "#0284c7",
                  }}
                  className="w-full px-3 py-2 text-xs font-semibold border rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                  onChange={(e) => {
                    const selected = catalogBooks.find((b) => b.code === e.target.value);
                    if (selected) {
                      setCode(selected.code.toUpperCase());
                      setTitle(selected.title.toUpperCase());
                    }
                  }}
                  value={catalogBooks.some((b) => b.code === code) ? code : ""}
                >
                  <option value="" disabled>
                    -- Select any book from catalog to auto-fill --
                  </option>
                  {catalogBooks.map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.code} — {b.title}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Selecting any book immediately loads the course code and title into the A4 cover preview.
                </p>
              </div>
            )}

            {/* VENDOR READ-ONLY SELECTED BOOK DISPLAY (Vendor cannot edit text) */}
            {!isAdmin ? (
              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800/80">
                  <span className="font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                    <Lock size={12} className="text-amber-400" />
                    Active Book Data (Admin Controlled)
                  </span>
                  <span className="text-[10px] text-emerald-400 font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    Official Edition
                  </span>
                </div>

                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-blue-300">
                    Course Code
                  </div>
                  <div className="text-lg font-black tracking-wider text-sky-400 font-mono mt-0.5">
                    {code || "NO BOOK SELECTED"}
                  </div>
                </div>

                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Course Title
                  </div>
                  <div className="text-sm font-bold text-white mt-0.5">
                    {title || "—"}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/60 text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Subtitle / Edition:</span>
                  <span className="text-slate-300 font-medium">{subtitle}</span>
                </div>

                <div className="text-[11px] text-slate-400 flex items-center justify-between">
                  <span>Badge Tagline:</span>
                  <span className="text-emerald-400 font-medium">{badgeText}</span>
                </div>
              </div>
            ) : (
              /* ADMIN EDITABLE INPUTS FORM */
              <div className="bg-slate-950/60 p-4 rounded-xl border border-purple-500/30 space-y-3.5">
                <div className="text-xs font-bold uppercase tracking-wider text-purple-300 pb-1 border-b border-purple-500/20">
                  Master Text & Typography Settings
                </div>

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
                    Subtitle / Edition (Master Default)
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
                    Badge / Tagline (Master Default)
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
            )}

            {/* Actions */}
            <div className="pt-1 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={handlePrint}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs md:text-sm rounded-xl shadow-lg transition-all cursor-pointer"
              >
                <Printer size={16} />
                <span>Print Cover (A4 Borderless)</span>
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
              Live A4 Preview (210 × 297 mm · 1240 × 1754 High-Res Borderless)
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
