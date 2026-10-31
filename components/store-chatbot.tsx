"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  MessageCircle,
  X,
  Send,
  Package,
  BookOpen,
  Truck,
  CreditCard,
  ExternalLink,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Phone,
  Copy,
  Check,
  QrCode,
  Download,
  Maximize2,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { useApp } from "./providers";
import { api, errorText } from "./shared";
import { money, formatWhatsAppPhone, isOtherCityOrder } from "../lib/contracts";
import { WhatsAppIcon } from "./whatsapp-icon";

export interface ChatMessage {
  id: string;
  sender: "bot" | "user";
  text?: string;
  timestamp: string;
  chips?: { label: string; action: string }[];
  card?: {
    type: "order" | "book" | "delivery" | "payment" | "contact" | "whatsapp";
    title: string;
    subtitle?: string;
    badge?: { text: string; color: string };
    details?: { label: string; value: string; copyable?: boolean; isMono?: boolean; highlight?: boolean }[];
    qrCode?: { url: string; label: string; subtitle?: string };
    actionButton?: { label: string; url?: string; onClick?: () => void; isExternal?: boolean };
  };
}

interface StoreChatbotProps {
  data: any; // Catalog data containing books, settings, etc.
  whatsappUrl?: string;
  onNavigate?: (mode: string, code?: string) => void;
}

function renderMessageText(text: string, isDark: boolean) {
  const lines = text.split("\n");
  return lines.map((line, lIndex) => {
    const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return (
      <React.Fragment key={lIndex}>
        {parts.map((part, pIndex) => {
          if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
            return (
              <strong key={pIndex} style={{ fontWeight: 700 }}>
                {part.slice(2, -2)}
              </strong>
            );
          }
          if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
            return (
              <code
                key={pIndex}
                style={{
                  padding: "1px 6px",
                  borderRadius: "5px",
                  backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)",
                  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                  fontSize: "0.85em",
                  fontWeight: 600,
                  color: isDark ? "#38bdf8" : "#0284c7",
                }}
              >
                {part.slice(1, -1)}
              </code>
            );
          }
          return part;
        })}
        {lIndex < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
}

export function StoreChatbot({ data, whatsappUrl, onNavigate }: StoreChatbotProps) {
  const { add } = useApp();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [chatQrModalOpen, setChatQrModalOpen] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevOpenRef = useRef(false);
  const prevMsgCountRef = useRef(1);

  const { resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  // Dynamic Theme Colors
  const colors = isDark
    ? {
        windowBg: "#0f172a",
        windowBorder: "#334155",
        headerBg: "linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%)",
        headerBorder: "#1e293b",
        titleColor: "#ffffff",
        subtextColor: "#94a3b8",
        closeBtnColor: "#94a3b8",
        closeBtnHoverBg: "#1e293b",
        msgBotBg: "#1e293b",
        msgBotBorder: "#334155",
        msgBotText: "#f8fafc",
        msgUserBg: "#2563eb",
        msgUserText: "#ffffff",
        cardBg: "#1e293b",
        cardBorder: "#334155",
        cardText: "#f1f5f9",
        cardMuted: "#94a3b8",
        chipsBarBg: "#0b1220",
        chipsBarBorder: "#1e293b",
        chipBg: "rgba(37, 99, 235, 0.18)",
        chipBorder: "rgba(59, 130, 246, 0.35)",
        chipText: "#93c5fd",
        inputBarBg: "#090d16",
        inputBarBorder: "#1e293b",
        inputBg: "#1e293b",
        inputBorder: "#334155",
        inputText: "#ffffff",
        inputPlaceholder: "#64748b",
        footerText: "#64748b",
      }
    : {
        windowBg: "#ffffff",
        windowBorder: "#e2e8f0",
        headerBg: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)",
        headerBorder: "#1d4ed8",
        titleColor: "#ffffff",
        subtextColor: "#dbeafe",
        closeBtnColor: "#e2e8f0",
        closeBtnHoverBg: "rgba(255,255,255,0.15)",
        msgBotBg: "#f1f5f9",
        msgBotBorder: "#e2e8f0",
        msgBotText: "#0f172a",
        msgUserBg: "#2563eb",
        msgUserText: "#ffffff",
        cardBg: "#f8fafc",
        cardBorder: "#e2e8f0",
        cardText: "#0f172a",
        cardMuted: "#64748b",
        chipsBarBg: "#f8fafc",
        chipsBarBorder: "#e2e8f0",
        chipBg: "rgba(37, 99, 235, 0.08)",
        chipBorder: "rgba(37, 99, 235, 0.25)",
        chipText: "#1d4ed8",
        inputBarBg: "#f8fafc",
        inputBarBorder: "#e2e8f0",
        inputBg: "#ffffff",
        inputBorder: "#cbd5e1",
        inputText: "#0f172a",
        inputPlaceholder: "#94a3b8",
        footerText: "#64748b",
      };

  const settings = data?.settings;
  const storeName = settings?.store_name || "LIBIS Campus Bookstore";
  const whatsappNum = settings?.whatsapp || "03034049973";
  const books: any[] = data?.books || [];

  const initialChips = [
    { label: "📦 Track Order", action: "track_prompt" },
    { label: "📘 Book Price", action: "book_prompt" },
    { label: "🚚 Delivery Info", action: "delivery_info" },
    { label: "💳 Bank Accounts", action: "payment_info" },
  ];

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: "msg-welcome",
        sender: "bot",
        text: `Hello! 👋 Welcome to **${storeName} Assistant**.\n\nYou can track your order status by Order ID or Phone Number, check book prices, or view official payment details.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ];
  });

  // Instant snap on reopen (0 vertical scroll lag/animation) & smooth scroll for incoming messages
  useEffect(() => {
    if (open) {
      if (!prevOpenRef.current) {
        // Just opened: immediately snap directly to the bottom where chat was left
        if (messagesContainerRef.current) {
          messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
      } else if (messages.length > prevMsgCountRef.current) {
        // New incoming message while already open: smooth scroll to view it
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }
      setTimeout(() => inputRef.current?.focus(), 60);
    }
    prevOpenRef.current = open;
    prevMsgCountRef.current = messages.length;
  }, [open, messages.length]);

  // Handle opening / closing
  const handleToggle = () => {
    setOpen((prev) => !prev);
  };

  const handleReset = () => {
    setMessages([
      {
        id: "msg-reset-" + Date.now(),
        sender: "bot",
        text: "Chat reset. Select a quick action below or type your question:",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  const copyText = (text: string, label: string, key?: string) => {
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        navigator.clipboard.writeText(text);
        if (key) {
          setCopiedKey(key);
          setTimeout(() => setCopiedKey(null), 2000);
        }
        toast.success(`${label} copied to clipboard! ✓`);
      }
    } catch {
      toast.info(text);
    }
  };

  // Safe Order Tracking Lookup
  const lookupOrder = async (query: string) => {
    setBusy(true);
    try {
      const res = await api("orders/" + encodeURIComponent(query.trim()));
      if (res && res.reference) {
        const isOther = isOtherCityOrder(res);
        const hasTracking = Boolean(res.courier_tracking_id);
        const trackingNum = res.courier_tracking_id ? String(res.courier_tracking_id).trim() : "";
        const isPakPost =
          trackingNum.toUpperCase().startsWith("UMS") ||
          trackingNum.toUpperCase().startsWith("EP") ||
          trackingNum.toUpperCase().startsWith("RP") ||
          (res.courier_name && String(res.courier_name).toLowerCase().includes("post"));

        let statusText = "Processing";
        let badgeColor = "#6366f1"; // indigo

        if (res.status === "PAYMENT_PENDING") {
          statusText = "Payment Verification Pending";
          badgeColor = "#f59e0b"; // amber
        } else if (res.status === "CONFIRMED") {
          statusText = "Payment Verified & Confirmed ✓";
          badgeColor = "#10b981"; // emerald
        } else if (res.status === "PROCESSING") {
          statusText = "Books Printing in Progress";
          badgeColor = "#6366f1"; // indigo
        } else if (res.status === "SHIPPED") {
          statusText = isOther
            ? hasTracking
              ? `Dispatched via Courier (${trackingNum}) 🚚`
              : "Dispatched (In Transit) 🚚"
            : res.delivery_type === "campus"
            ? "Ready for Campus Collection 🏫"
            : "Out for Delivery 🛵";
          badgeColor = "#8b5cf6"; // purple
        } else if (res.status === "DELIVERED") {
          statusText = "Delivered ✓";
          badgeColor = "#059669"; // emerald
        }

        const bookCount = res.total_books || res.items?.length || 1;
        const bookDetailsStr = (res.items || [])
          .slice(0, 3)
          .map((it: any) => `${it.code || it.course_code || ""} (${it.quantity || 1}x)`)
          .join(", ") + ((res.items || []).length > 3 ? "..." : "");

        const details: { label: string; value: string; copyable?: boolean; isMono?: boolean }[] = [
          { label: "Recipient", value: `${res.name || "Student"} (${res.city || "Other City"})` },
          { label: "Status", value: statusText },
          { label: "Books", value: `${bookCount} Books: ${bookDetailsStr}` },
          { label: "Total Amount", value: money(res.total) },
        ];

        if (Number(res.due_amount || 0) > 0) {
          details.push({ label: "Remaining Due", value: money(res.due_amount) });
        }

        if (hasTracking) {
          details.push({
            label: "Courier Tracking #",
            value: `${res.courier_name || "Pakistan Post"}: ${trackingNum}`,
            copyable: true,
            isMono: true,
          });
        }

        const botReply: ChatMessage = {
          id: "bot-" + Date.now(),
          sender: "bot",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          card: {
            type: "order",
            title: `Order #${res.reference}`,
            subtitle: statusText,
            badge: { text: res.status, color: badgeColor },
            details: details,
            actionButton: hasTracking && isPakPost
              ? {
                  label: "Track on ep.gov.pk ↗",
                  url: "https://ep.gov.pk/",
                  isExternal: true,
                }
              : {
                  label: "Open Full Tracking Page",
                  url: `/track?id=${encodeURIComponent(res.reference)}`,
                  isExternal: false,
                },
          },
        };
        setMessages((prev) => [...prev, botReply]);
        return;
      }
    } catch {
      // Order not found
    } finally {
      setBusy(false);
    }

    // Not found fallback
    setMessages((prev) => [
      ...prev,
      {
        id: "bot-" + Date.now(),
        sender: "bot",
        text: `Order not found for **"${query}"**.\n\nPlease check your **Order Reference** (e.g. \`VU-2710-0006\`) or **Phone Number** and try again:`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        card: {
          type: "whatsapp",
          title: "Helpline Support",
          subtitle: "Contact Campus Admin on WhatsApp",
          actionButton: {
            label: "💬 WhatsApp Admin",
            url: `https://wa.me/${formatWhatsAppPhone(whatsappNum)}?text=${encodeURIComponent(
              `Hello, I need help checking my order (${query}).`
            )}`,
            isExternal: true,
          },
        },
      },
    ]);
  };

  // Book Price & Catalog Search
  const searchBook = (query: string) => {
    const qClean = query.trim().toUpperCase().replace(/\s+/g, "");
    const codeMatch = qClean.match(/[A-Z]{2,4}[0-9]{3}/);
    const searchTarget = codeMatch ? codeMatch[0] : qClean;

    // Search by code, course_code or title
    const matches = books.filter((b) => {
      const bCode = (b.code || "").toUpperCase().replace(/\s+/g, "");
      const cCode = (b.course_code || "").toUpperCase().replace(/\s+/g, "");
      const title = (b.title || "").toUpperCase();
      return (
        bCode.includes(searchTarget) ||
        cCode.includes(searchTarget) ||
        title.includes(query.toUpperCase().trim())
      );
    });

    if (matches.length > 0) {
      const topMatches = matches.slice(0, 2);
      topMatches.forEach((book) => {
        const priceStr = money(book.price);
        const botReply: ChatMessage = {
          id: "bot-book-" + Math.random(),
          sender: "bot",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          card: {
            type: "book",
            title: book.code || book.course_code || "Book Details",
            details: [
              { label: "Book Name", value: book.title },
              { label: "Course Code", value: book.code || book.course_code },
              { label: "Price", value: priceStr, highlight: true },
            ],
            actionButton: {
              label: "🛒 Add to Cart",
              onClick: () => {
                add(book);
              },
            },
          },
        };
        setMessages((prev) => [...prev, botReply]);
      });
      return;
    }

    // No book found
    setMessages((prev) => [
      ...prev,
      {
        id: "bot-" + Date.now(),
        sender: "bot",
        text: `Course **"${query}"** was not found in the catalog. Please search with a course code (e.g. \`CS101\`, \`MTH101\`, \`ENG101\`, \`ACC501\`).`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  // Main NLP / Intent Processor
  const processQuery = async (userText: string) => {
    const raw = userText.trim();
    if (!raw) return;

    // Add user message to state
    const userMsg: ChatMessage = {
      id: "user-" + Date.now(),
      sender: "user",
      text: raw,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    const upper = raw.toUpperCase();

    // 1. Order Reference pattern (e.g. VU-2710-0006 or 2710-0006)
    const refMatch = raw.match(/VU-\d{2,4}-\d{4}/i) || raw.match(/\b\d{4}-\d{4}\b/);
    if (refMatch) {
      await lookupOrder(refMatch[0].toUpperCase());
      return;
    }

    // Phone Number pattern (7 to 15 digits, e.g. 03001234567, 0303-4049973, +92...)
    const phoneDigits = raw.replace(/\D/g, "");
    if (phoneDigits.length >= 7 && phoneDigits.length <= 15 && !/[a-zA-Z]/.test(raw)) {
      await lookupOrder(raw.trim());
      return;
    }

    // 2. Explicit order tracking request without reference or phone
    if (
      upper.includes("TRACK") ||
      upper.includes("ORDER") ||
      upper.includes("STATUS") ||
      upper.includes("WHERE IS MY ORDER") ||
      upper.includes("MERA ORDER")
    ) {
      setMessages((prev) => [
        ...prev,
        {
          id: "bot-" + Date.now(),
          sender: "bot",
          text: `Please enter your **Order ID** (e.g. \`VU-2710-0006\`) or the **Phone Number** used when placing the order:`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      setTimeout(() => inputRef.current?.focus(), 150);
      return;
    }

    // 3. Subject / Course Code Query (e.g. CS101, MTH101, BIF501, ACC501)
    const courseCodeMatch = upper.match(/[A-Z]{2,4}\s?[0-9]{3}/);
    if (courseCodeMatch) {
      searchBook(courseCodeMatch[0]);
      return;
    }

    // 4. Book Price Request without course code (Prompts student for book name/code)
    if (
      upper.includes("BOOK PRICE") ||
      upper.includes("BOOK") ||
      upper.includes("PRICE") ||
      upper.includes("RATE") ||
      upper.includes("COST")
    ) {
      setMessages((prev) => [
        ...prev,
        {
          id: "bot-" + Date.now(),
          sender: "bot",
          text: `Please enter your **Course Code or Book Name** (e.g. \`CS101\`, \`MTH101\`, \`ENG101\`, \`ACC501\`):\n\nI will check the student price for you right away: 👇`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      setTimeout(() => inputRef.current?.focus(), 150);
      return;
    }

    // 5. Delivery Options
    if (
      upper.includes("DELIVERY") ||
      upper.includes("SHIPPING") ||
      upper.includes("DISPATCH") ||
      upper.includes("COURIER")
    ) {
      setMessages((prev) => [
        ...prev,
        {
          id: "bot-" + Date.now(),
          sender: "bot",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          card: {
            type: "delivery",
            title: "🚚 Delivery Options",
            subtitle: "3 convenient delivery options available at checkout",
            details: [
              { label: "Option 1", value: "VU Qanchi Campus Collection" },
              { label: "Option 2", value: "Lahore Home Delivery" },
              { label: "Option 3", value: "Other Cities Nationwide Delivery" },
            ],
          },
        },
      ]);
      return;
    }

    // 5. Payment Methods & Detailed Bank Accounts (including QR Code)
    if (
      upper.includes("PAYMENT") ||
      upper.includes("JAZZCASH") ||
      upper.includes("EASYPAISA") ||
      upper.includes("BANK") ||
      upper.includes("ACCOUNT") ||
      upper.includes("PAISA") ||
      upper.includes("RAAST") ||
      upper.includes("IBAN") ||
      upper.includes("TITLE") ||
      upper.includes("SLIP") ||
      upper.includes("RECEIPT") ||
      upper.includes("QR") ||
      upper.includes("SCAN")
    ) {
      const bankName = settings?.bank_name || "Meezan Bank";
      const accountTitle = settings?.account_title || "DIGITAL GROWTH HUB";
      const bankAccount = settings?.bank_account || "11550109645933";
      const bankIban = settings?.bank_iban || "PK29MEZN0011550109645933";
      const bankQr = settings?.bank_qr_url || "/meezan-qr.png";

      setMessages((prev) => [
        ...prev,
        {
          id: "bot-" + Date.now(),
          sender: "bot",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          card: {
            type: "payment",
            title: "💳 Official Bank & Payment Accounts",
            subtitle: "Transfer via EasyPaisa, JazzCash, Raast, or Banking App",
            badge: { text: "Official Account ✓", color: "#10b981" },
            details: [
              { label: "Bank Name", value: bankName },
              { label: "Account Title", value: accountTitle, copyable: true },
              { label: "Account Number", value: bankAccount, copyable: true, isMono: true },
              { label: "IBAN", value: bankIban, copyable: true, isMono: true },
            ],
            qrCode: {
              url: bankQr,
              label: "Meezan Bank Raast QR",
              subtitle: "Scan via EasyPaisa, JazzCash, Raast, or Banking App",
            },
            actionButton: {
              label: "📋 Copy Account Details",
              onClick: () => {
                copyText(
                  `Bank: ${bankName}\nAccount Title: ${accountTitle}\nAccount Number: ${bankAccount}\nIBAN: ${bankIban}`,
                  "Bank Details"
                );
              },
            },
          },
        },
      ]);
      return;
    }

    // 6. Address / Campus Location / Helpline
    if (
      upper.includes("ADDRESS") ||
      upper.includes("LOCATION") ||
      upper.includes("CAMPUS") ||
      upper.includes("CONTACT") ||
      upper.includes("PHONE") ||
      upper.includes("HELPLINE")
    ) {
      const address = settings?.distribution_center_address || "VU Qanchi Campus, Ferozepur Road, Lahore";
      setMessages((prev) => [
        ...prev,
        {
          id: "bot-" + Date.now(),
          sender: "bot",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          card: {
            type: "contact",
            title: "📍 Campus Bookstore Office",
            subtitle: storeName,
            details: [
              { label: "Campus Address", value: address },
              { label: "WhatsApp Helpline", value: whatsappNum },
              { label: "Email", value: settings?.email || "info@campusbookstore.com" },
            ],
            actionButton: {
              label: "Chat on WhatsApp ↗",
              url: `https://wa.me/${formatWhatsAppPhone(whatsappNum)}`,
              isExternal: true,
            },
          },
        },
      ]);
      return;
    }

    // 7. Greetings
    if (
      upper.includes("HELLO") ||
      upper.includes("HI") ||
      upper.includes("HEY") ||
      upper.includes("SALAM") ||
      upper.includes("AOA") ||
      upper.includes("HELP")
    ) {
      setMessages((prev) => [
        ...prev,
        {
          id: "bot-" + Date.now(),
          sender: "bot",
          text: "Hello! 👋 How can I help you today? Select any of the quick action buttons below or ask your question:",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
      return;
    }

    // 8. Search Book Title in catalog if student entered book title directly
    if (raw.length >= 3) {
      const titleMatches = books.filter((b) =>
        (b.title || "").toUpperCase().includes(upper.trim())
      );
      if (titleMatches.length > 0) {
        searchBook(raw);
        return;
      }
    }

    // 9. Default Fallback with WhatsApp Handover
    setMessages((prev) => [
      ...prev,
      {
        id: "bot-" + Date.now(),
        sender: "bot",
        text: "For further assistance with your inquiry, please contact our support team on WhatsApp:",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        card: {
          type: "whatsapp",
          title: "Direct WhatsApp Support",
          subtitle: "Official Campus Bookstore Helpline",
          actionButton: {
            label: "💬 WhatsApp Admin",
            url: `https://wa.me/${formatWhatsAppPhone(whatsappNum)}?text=${encodeURIComponent(raw)}`,
            isExternal: true,
          },
        },
      },
    ]);
  };

  const handleChipClick = (action: string) => {
    if (action === "track_prompt") {
      processQuery("Track my order");
    } else if (action === "book_prompt") {
      processQuery("Check book price");
    } else if (action === "delivery_info") {
      processQuery("Delivery options");
    } else if (action === "payment_info") {
      processQuery("Bank and payment accounts");
    } else {
      processQuery(action);
    }
  };

  return (
    <>
      {/* ========================================================= */}
      {/* FLOATING ACTION BUTTON (CAMPUS ASSISTANT TRIGGER)        */}
      {/* ========================================================= */}
      <button
        type="button"
        onClick={handleToggle}
        className="no-print store-chatbot-fab"
        style={{
          position: "fixed",
          bottom: "20px",
          right: "20px",
          zIndex: 35,
          width: "50px",
          height: "50px",
          borderRadius: "50%",
          background: "linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)",
          color: "#ffffff",
          border: "2px solid rgba(255, 255, 255, 0.25)",
          boxShadow: "0 8px 24px rgba(37, 99, 235, 0.45)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
          flexShrink: 0,
          padding: 0,
        }}
        title="Campus Assistant Chat"
        onMouseEnter={(e) => (e.currentTarget.style.transform = "scale(1.08)")}
        onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
        aria-label="Open AI Campus Assistant"
      >
        {open ? (
          <X size={22} />
        ) : (
          <>
            <MessageCircle size={24} />
            <span
              style={{
                position: "absolute",
                top: "2px",
                right: "2px",
                width: "11px",
                height: "11px",
                borderRadius: "50%",
                backgroundColor: "#10b981",
                border: "2px solid #ffffff",
              }}
            />
          </>
        )}
      </button>

      {/* ========================================================= */}
      {/* CHAT WINDOW POPUP (MODERN COLLAPSIBLE DIALOG)            */}
      {/* ========================================================= */}
      <div
        style={{
          position: "fixed",
          bottom: "80px",
          right: "20px",
          width: "calc(100vw - 40px)",
          maxWidth: "395px",
          height: "540px",
          maxHeight: "calc(100vh - 100px)",
          backgroundColor: colors.windowBg,
          color: colors.cardText,
          borderRadius: "20px",
          border: `1px solid ${colors.windowBorder}`,
          boxShadow: isDark
            ? "0 25px 50px -12px rgba(0, 0, 0, 0.7)"
            : "0 20px 40px -10px rgba(0, 0, 0, 0.18)",
          display: open ? "flex" : "none",
          flexDirection: "column",
          overflow: "hidden",
          zIndex: 40,
          backdropFilter: "blur(12px)",
        }}
        className="no-print store-chatbot-window"
      >
          {/* Header */}
          <div
            style={{
              padding: "12px 16px",
              background: colors.headerBg,
              borderBottom: `1px solid ${colors.headerBorder}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  background: isDark
                    ? "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)"
                    : "#ffffff",
                  color: isDark ? "#ffffff" : "#2563eb",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "1.1rem",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                  position: "relative",
                }}
              >
                🤖
                <span
                  style={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    width: "9px",
                    height: "9px",
                    borderRadius: "50%",
                    backgroundColor: "#10b981",
                    border: "1.5px solid #ffffff",
                  }}
                />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ fontSize: "0.88rem", fontWeight: 700, color: colors.titleColor }}>
                    Campus Assistant
                  </span>
                  <span
                    style={{
                      fontSize: "0.62rem",
                      fontWeight: 700,
                      padding: "1px 6px",
                      borderRadius: "9999px",
                      backgroundColor: "rgba(16, 185, 129, 0.2)",
                      color: isDark ? "#34d399" : "#d1fae5",
                    }}
                  >
                    Online
                  </span>
                </div>
                <div style={{ fontSize: "0.72rem", color: colors.subtextColor }}>
                  Real-time orders, books & info
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <button
                type="button"
                onClick={handleReset}
                style={{
                  background: "transparent",
                  border: "none",
                  color: colors.closeBtnColor,
                  padding: "6px",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
                title="Reset conversation"
              >
                <RotateCcw size={15} />
              </button>
              <button
                type="button"
                onClick={handleToggle}
                style={{
                  background: "transparent",
                  border: "none",
                  color: colors.closeBtnColor,
                  padding: "6px",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
                title="Close chat"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div
            ref={messagesContainerRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "14px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              fontSize: "0.82rem",
              backgroundColor: colors.windowBg,
            }}
          >
            {messages.map((m) => (
              <div
                key={m.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: m.sender === "user" ? "flex-end" : "flex-start",
                  gap: "4px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "8px",
                    maxWidth: "92%",
                  }}
                >
                  {m.sender === "bot" && (
                    <div
                      style={{
                        width: "26px",
                        height: "26px",
                        borderRadius: "50%",
                        backgroundColor: "#2563eb",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.75rem",
                        flexShrink: 0,
                        marginTop: "2px",
                      }}
                    >
                      🤖
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "6px",
                    }}
                  >
                    {m.text && (
                      <div
                        style={{
                          padding: "10px 14px",
                          borderRadius:
                            m.sender === "user" ? "16px 16px 2px 16px" : "16px 16px 16px 2px",
                          backgroundColor: m.sender === "user" ? colors.msgUserBg : colors.msgBotBg,
                          color: m.sender === "user" ? colors.msgUserText : colors.msgBotText,
                          lineHeight: "1.45",
                          border: m.sender === "user" ? "none" : `1px solid ${colors.msgBotBorder}`,
                        }}
                      >
                        {renderMessageText(m.text, isDark)}
                      </div>
                    )}

                    {/* Rich Response Cards */}
                    {m.card && (
                      <div
                        style={{
                          backgroundColor: colors.cardBg,
                          border: `1px solid ${colors.cardBorder}`,
                          borderRadius: "14px",
                          padding: "12px",
                          width: "100%",
                          maxWidth: "310px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                          boxShadow: "0 4px 6px rgba(0,0,0,0.06)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            borderBottom: `1px solid ${colors.cardBorder}`,
                            paddingBottom: "6px",
                          }}
                        >
                          <span style={{ fontWeight: 700, color: colors.cardText, fontSize: "0.85rem" }}>
                            {m.card.title}
                          </span>
                          {m.card.badge && (
                            <span
                              style={{
                                fontSize: "0.62rem",
                                fontWeight: 700,
                                padding: "2px 6px",
                                borderRadius: "4px",
                                backgroundColor: m.card.badge.color + "25",
                                color: m.card.badge.color,
                              }}
                            >
                              {m.card.badge.text}
                            </span>
                          )}
                        </div>

                        {m.card.subtitle && (
                          <div style={{ fontSize: "0.72rem", color: colors.cardMuted, marginTop: "-3px" }}>
                            {m.card.subtitle}
                          </div>
                        )}

                        {m.card.details && (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "6px",
                              fontSize: "0.75rem",
                              color: colors.cardText,
                            }}
                          >
                            {m.card.details.map((d, i) => (
                              <div
                                key={i}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  alignItems: "center",
                                  gap: "8px",
                                  padding: d.highlight ? "6px 0" : "3px 0",
                                  borderBottom: i < m.card!.details!.length - 1 ? `1px dashed ${colors.cardBorder}` : "none",
                                }}
                              >
                                <span
                                  style={{
                                    color: d.highlight ? (isDark ? "#f1f5f9" : "#0f172a") : colors.cardMuted,
                                    flexShrink: 0,
                                    fontWeight: d.highlight ? 700 : 500,
                                    fontSize: d.highlight ? "0.84rem" : "0.75rem",
                                  }}
                                >
                                  {d.label}:
                                </span>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <span
                                    style={{
                                      fontWeight: d.highlight ? 800 : 600,
                                      fontSize: d.highlight ? "1.05rem" : "0.75rem",
                                      textAlign: "right",
                                      fontFamily: d.isMono ? "monospace" : "inherit",
                                      color: d.highlight
                                        ? (isDark ? "#38bdf8" : "#2563eb")
                                        : d.isMono
                                        ? (isDark ? "#38bdf8" : "#0284c7")
                                        : colors.cardText,
                                      wordBreak: "break-all",
                                    }}
                                  >
                                    {d.value}
                                  </span>
                                  {d.copyable && (
                                    <button
                                      type="button"
                                      onClick={() => copyText(d.value, d.label, `${m.id}-${i}`)}
                                      style={{
                                        background: isDark ? "rgba(56, 189, 248, 0.15)" : "rgba(2, 132, 199, 0.1)",
                                        border: "none",
                                        color: isDark ? "#38bdf8" : "#0284c7",
                                        padding: "2px 6px",
                                        borderRadius: "4px",
                                        cursor: "pointer",
                                        display: "inline-flex",
                                        alignItems: "center",
                                        gap: "2px",
                                        fontSize: "0.65rem",
                                        fontWeight: 600,
                                      }}
                                      title={`Copy ${d.label}`}
                                    >
                                      {copiedKey === `${m.id}-${i}` ? (
                                        <Check size={11} style={{ color: "#10b981" }} />
                                      ) : (
                                        <Copy size={11} />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Instant QR Code Option inside Card */}
                        {m.card.qrCode && (
                          <div
                            style={{
                              marginTop: "4px",
                              padding: "9px 10px",
                              borderRadius: "10px",
                              backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(37,99,235,0.05)",
                              border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "8px",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                cursor: "pointer",
                                flex: 1,
                              }}
                              onClick={() => setChatQrModalOpen(m.card?.qrCode?.url || "/meezan-qr.png")}
                              title="Click to enlarge QR Code"
                            >
                              <div
                                style={{
                                  width: "44px",
                                  height: "44px",
                                  borderRadius: "7px",
                                  backgroundColor: "#ffffff",
                                  padding: "2px",
                                  border: "1px solid #cbd5e1",
                                  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                                  flexShrink: 0,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <img
                                  src={m.card.qrCode.url}
                                  alt="Payment QR"
                                  style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                                />
                              </div>
                              <div>
                                <div
                                  style={{
                                    fontSize: "0.74rem",
                                    fontWeight: 700,
                                    color: colors.cardText,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "4px",
                                  }}
                                >
                                  <QrCode size={13} style={{ color: "#2563eb" }} />
                                  <span>{m.card.qrCode.label || "Payment QR Code"}</span>
                                </div>
                                <div
                                  style={{
                                    fontSize: "0.64rem",
                                    color: colors.cardMuted,
                                    marginTop: "1px",
                                    lineHeight: "1.25",
                                  }}
                                >
                                  {m.card.qrCode.subtitle || "Tap to scan or save"}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => setChatQrModalOpen(m.card?.qrCode?.url || "/meezan-qr.png")}
                              style={{
                                padding: "5px 8px",
                                borderRadius: "6px",
                                backgroundColor: isDark ? "rgba(56, 189, 248, 0.18)" : "rgba(37, 99, 235, 0.12)",
                                color: isDark ? "#38bdf8" : "#2563eb",
                                border: `1px solid ${isDark ? "rgba(56, 189, 248, 0.35)" : "rgba(37, 99, 235, 0.25)"}`,
                                fontSize: "0.66rem",
                                fontWeight: 700,
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                                flexShrink: 0,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "3px",
                              }}
                            >
                              <Maximize2 size={11} />
                              Enlarge
                            </button>
                          </div>
                        )}

                        {m.card.actionButton && (
                          <div style={{ paddingTop: "4px" }}>
                            {m.card.actionButton.url ? (
                              <a
                                href={m.card.actionButton.url}
                                target={m.card.actionButton.isExternal ? "_blank" : "_self"}
                                rel={m.card.actionButton.isExternal ? "noopener noreferrer" : ""}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: "5px",
                                  width: "100%",
                                  padding: "7px 12px",
                                  borderRadius: "8px",
                                  backgroundColor: "#2563eb",
                                  color: "#ffffff",
                                  fontWeight: 700,
                                  fontSize: "0.76rem",
                                  textDecoration: "none",
                                }}
                              >
                                {m.card.actionButton.label}
                              </a>
                            ) : (
                              <button
                                type="button"
                                onClick={m.card.actionButton.onClick}
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  gap: "6px",
                                  width: "100%",
                                  padding: "8px 12px",
                                  borderRadius: "8px",
                                  backgroundColor: m.card.type === "book" ? "#16a34a" : "#2563eb",
                                  color: "#ffffff",
                                  fontWeight: 700,
                                  fontSize: "0.78rem",
                                  border: "none",
                                  cursor: "pointer",
                                  transition: "all 0.15s ease",
                                }}
                              >
                                {m.card.actionButton.label}
                              </button>
                            )}
                            {m.card.type === "book" && (
                              <a
                                href="/cart"
                                style={{
                                  display: "block",
                                  textAlign: "center",
                                  marginTop: "6px",
                                  fontSize: "0.72rem",
                                  color: isDark ? "#60a5fa" : "#2563eb",
                                  textDecoration: "underline",
                                  fontWeight: 600,
                                }}
                              >
                                View Cart & Checkout ↗
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <span
                  style={{
                    fontSize: "0.62rem",
                    color: colors.cardMuted,
                    padding: m.sender === "user" ? "0 4px 0 0" : "0 0 0 34px",
                  }}
                >
                  {m.timestamp}
                </span>
              </div>
            ))}

            {busy && (
              <div style={{ display: "flex", alignItems: "center", gap: "8px", color: colors.cardMuted }}>
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    backgroundColor: "#2563eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.7rem",
                    color: "#fff",
                  }}
                >
                  🤖
                </div>
                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: "14px",
                    backgroundColor: colors.cardBg,
                    fontSize: "0.75rem",
                    border: `1px solid ${colors.cardBorder}`,
                  }}
                >
                  Searching database...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* ========================================================= */}
          {/* PINNED STICKY QUICK ACTIONS (PERFECT 2-COLUMN GRID ALIGN)  */}
          {/* ========================================================= */}
          <div
            style={{
              padding: "7px 12px",
              backgroundColor: colors.chipsBarBg,
              borderTop: `1px solid ${colors.chipsBarBorder}`,
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 2px",
              }}
            >
              <span
                style={{
                  fontSize: "0.64rem",
                  fontWeight: 700,
                  color: colors.cardMuted,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <span>⚡ Quick Actions</span>
              </span>
              <button
                type="button"
                onClick={() => setShowQuickActions((prev) => !prev)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: colors.chipText,
                  fontSize: "0.65rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: "0 4px",
                }}
              >
                {showQuickActions ? "Hide ▾" : "Show (4) ▴"}
              </button>
            </div>

            {showQuickActions && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "6px",
                  width: "100%",
                }}
              >
                {initialChips.map((c, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleChipClick(c.action)}
                    style={{
                      padding: "6px 8px",
                      height: "32px",
                      borderRadius: "8px",
                      backgroundColor: colors.chipBg,
                      border: `1px solid ${colors.chipBorder}`,
                      color: colors.chipText,
                      fontSize: "0.74rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "5px",
                      textAlign: "center",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      transition: "all 0.15s ease",
                      width: "100%",
                      boxSizing: "border-box",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-1px)";
                      e.currentTarget.style.filter = "brightness(1.08)";
                      e.currentTarget.style.boxShadow = "0 2px 4px rgba(0,0,0,0.08)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "none";
                      e.currentTarget.style.filter = "none";
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input Box Footer */}
          <div
            style={{
              padding: "10px 14px",
              backgroundColor: colors.inputBarBg,
              borderTop: `1px solid ${colors.inputBarBorder}`,
            }}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                processQuery(input);
              }}
              style={{ display: "flex", alignItems: "center", gap: "8px" }}
            >
              <input
                ref={inputRef}
                type="text"
                placeholder="Ask a question (e.g. CS101, VU-2710-0006, 0300...)..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: "10px",
                  backgroundColor: colors.inputBg,
                  border: `1px solid ${colors.inputBorder}`,
                  color: colors.inputText,
                  fontSize: "0.78rem",
                  outline: "none",
                }}
              />
              <button
                type="submit"
                disabled={!input.trim()}
                style={{
                  padding: "8px 12px",
                  borderRadius: "10px",
                  backgroundColor: input.trim() ? "#2563eb" : (isDark ? "#334155" : "#cbd5e1"),
                  color: "#ffffff",
                  border: "none",
                  cursor: input.trim() ? "pointer" : "not-allowed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                title="Send message"
              >
                <Send size={14} />
              </button>
            </form>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: "6px",
                fontSize: "0.68rem",
                color: colors.footerText,
              }}
            >
              <span>Instant answers from bookstore catalog</span>
              <a
                href={whatsappUrl || `https://wa.me/${formatWhatsAppPhone(whatsappNum)}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: "#10b981",
                  textDecoration: "none",
                  fontWeight: 700,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <WhatsAppIcon size={12} />
                <span>Admin WhatsApp ↗</span>
              </a>
            </div>
          </div>
        </div>

      {/* ========================================================= */}
      {/* FULL-SIZE QR CODE ZOOM MODAL (FOR MOBILE SCANNING & SAVE) */}
      {/* ========================================================= */}
      {chatQrModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.78)",
            backdropFilter: "blur(5px)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={() => setChatQrModalOpen(null)}
        >
          <div
            style={{
              backgroundColor: colors.windowBg,
              color: colors.cardText,
              borderRadius: "18px",
              padding: "20px",
              maxWidth: "340px",
              width: "100%",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
              border: `1px solid ${colors.windowBorder}`,
              textAlign: "center",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "14px",
                paddingBottom: "10px",
                borderBottom: `1px solid ${colors.cardBorder}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "0.92rem", color: colors.titleColor }}>
                <QrCode size={19} style={{ color: "#2563eb" }} />
                <span>Meezan Bank Raast QR</span>
              </div>
              <button
                type="button"
                onClick={() => setChatQrModalOpen(null)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: colors.closeBtnColor,
                  cursor: "pointer",
                  padding: "4px",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                title="Close QR"
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                background: "#ffffff",
                padding: "12px",
                borderRadius: "14px",
                display: "inline-block",
                boxShadow: "0 6px 18px rgba(0,0,0,0.18)",
                marginBottom: "12px",
                border: "1px solid #e2e8f0",
              }}
            >
              <img
                src={chatQrModalOpen}
                alt="Meezan Bank QR Code"
                style={{ width: "230px", height: "230px", objectFit: "contain", display: "block" }}
              />
            </div>

            <p style={{ fontSize: "0.76rem", color: colors.cardMuted, margin: "0 0 14px 0", lineHeight: "1.4" }}>
              Scan via <strong>EasyPaisa, JazzCash, Raast</strong>, or any mobile banking app to transfer directly.
            </p>

            <div style={{ display: "flex", gap: "8px" }}>
              <a
                href={chatQrModalOpen}
                download="meezan-payment-qr.png"
                style={{
                  flex: 1,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "9px 12px",
                  backgroundColor: "#2563eb",
                  color: "#ffffff",
                  borderRadius: "8px",
                  fontWeight: 700,
                  fontSize: "0.78rem",
                  textDecoration: "none",
                }}
              >
                <Download size={14} />
                Save QR Code
              </a>
              <button
                type="button"
                onClick={() => setChatQrModalOpen(null)}
                style={{
                  padding: "9px 14px",
                  backgroundColor: isDark ? "#334155" : "#e2e8f0",
                  color: colors.cardText,
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "0.78rem",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
