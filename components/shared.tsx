"use client";
import { useState, useRef, useEffect, type ReactNode } from "react";
import { ChevronDown, Check } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { statuses } from "@/lib/contracts";
export async function api(
  path: string,
  body?: unknown,
  method = "POST",
  headers: Record<string, string> = {},
) {
  const r = await fetch("/api/" + path, {
    method: body === undefined ? "GET" : method,
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "CampusBookstore",
      ...headers,
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const data: any = await r.json();
  if (!r.ok) throw new Error(data.error || "Unable to complete the request.");
  return data;
}
export const errorText = (e: unknown) =>
  e instanceof Error ? e.message : "Something went wrong. Please try again.";
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}
export function Choose({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  label: string;
}) {
  return (
    <Select value={value || "none"} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className="choice">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem value={o.value || "none"} key={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function MultiChoose({
  values,
  onChange,
  options,
  label,
  allLabel = "All options",
}: {
  values: string[];
  onChange: (v: string[]) => void;
  options: { value: string; label: string }[];
  label: string;
  allLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const allSelected = values.length === 0 || values.includes("all") || values.length === options.length;

  const toggle = (val: string) => {
    if (val === "all") {
      onChange([]);
      return;
    }
    const cleanValues = values.filter((v) => v !== "all");
    let next: string[];
    if (cleanValues.includes(val)) {
      next = cleanValues.filter((v) => v !== val);
    } else {
      next = [...cleanValues, val];
    }
    if (next.length === options.length) {
      onChange([]);
    } else {
      onChange(next);
    }
  };

  const getButtonText = () => {
    if (allSelected) return allLabel;
    if (values.length === 1) {
      const match = options.find((o) => o.value === values[0]);
      return match ? match.label : values[0];
    }
    const matchedLabels = values.map(
      (v) => options.find((o) => o.value === v)?.label || v,
    );
    if (matchedLabels.length <= 2) {
      return matchedLabels.join(", ");
    }
    return `${matchedLabels.length} selected`;
  };

  return (
    <div className="relative inline-block" ref={containerRef} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="choice"
        aria-label={label}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          padding: "0 12px",
          cursor: "pointer",
          border: "1px solid var(--border)",
          background: "var(--card)",
          color: "var(--foreground)",
          fontWeight: 500,
          whiteSpace: "nowrap",
          userSelect: "none",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", maxWidth: 170 }}>
          {getButtonText()}
        </span>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
          {!allSelected && values.length > 1 && (
            <span
              style={{
                fontSize: "0.72rem",
                background: "var(--primary)",
                color: "var(--primary-foreground)",
                borderRadius: "10px",
                padding: "1px 6px",
                fontWeight: 600,
                lineHeight: "1.2",
              }}
            >
              {values.length}
            </span>
          )}
          <ChevronDown
            size={14}
            style={{
              transition: "transform 0.15s ease",
              transform: open ? "rotate(180deg)" : "none",
              color: "var(--muted-foreground)",
            }}
          />
        </div>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            zIndex: 60,
            minWidth: "220px",
            background: "var(--popover)",
            color: "var(--popover-foreground)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            padding: "6px",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
            maxHeight: "320px",
            overflowY: "auto",
          }}
        >
          {/* Option: All */}
          <div
            onClick={() => toggle("all")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "7px 10px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.85rem",
              fontWeight: allSelected ? 600 : 400,
              background: allSelected ? "rgba(var(--primary-rgb, 59, 130, 246), 0.08)" : "transparent",
            }}
          >
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: 4,
                border: allSelected ? "1.5px solid var(--primary)" : "1.5px solid var(--muted-foreground)",
                background: allSelected ? "var(--primary)" : "transparent",
                display: "grid",
                placeContent: "center",
                color: "var(--primary-foreground)",
                flexShrink: 0,
              }}
            >
              {allSelected && <Check size={12} strokeWidth={3} />}
            </div>
            <span>{allLabel}</span>
          </div>

          <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />

          {/* Individual Options with Checkboxes */}
          {options.map((opt) => {
            const isChecked = !allSelected && values.includes(opt.value);
            return (
              <div
                key={opt.value}
                onClick={() => toggle(opt.value)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "7px 10px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  fontWeight: isChecked ? 600 : 400,
                  background: isChecked ? "rgba(var(--primary-rgb, 59, 130, 246), 0.08)" : "transparent",
                }}
              >
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    border: isChecked ? "1.5px solid var(--primary)" : "1.5px solid var(--muted-foreground)",
                    background: isChecked ? "var(--primary)" : "transparent",
                    display: "grid",
                    placeContent: "center",
                    color: "var(--primary-foreground)",
                    flexShrink: 0,
                  }}
                >
                  {isChecked && <Check size={12} strokeWidth={3} />}
                </div>
                <span>{opt.label}</span>
              </div>
            );
          })}

          {!allSelected && (
            <>
              <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />
              <button
                type="button"
                onClick={() => onChange([])}
                style={{
                  border: "none",
                  background: "transparent",
                  color: "var(--primary)",
                  fontSize: "0.78rem",
                  padding: "5px 10px",
                  cursor: "pointer",
                  textAlign: "center",
                  fontWeight: 600,
                  borderRadius: "4px",
                }}
              >
                Reset to {allLabel}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
export function Blank({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <Empty className="blank">
      <EmptyHeader>
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>
      {children}
    </Empty>
  );
}
export function Loading() {
  return (
    <div className="loading-grid" aria-label="Loading" role="status">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-36 rounded-xl" />
      ))}
    </div>
  );
}
export function Status({ value, label }: { value: string; label?: string }) {
  return (
    <span
      className={
        "status " +
        (["VERIFIED", "CONFIRMED", "DELIVERED", "AMOUNT_MATCHED"].includes(
          value,
        )
          ? "good"
          : ["REJECTED", "CANCELLED", "AMOUNT_MISMATCH"].includes(value)
            ? "bad"
            : "")
      }
    >
      {label || statuses[value] || value.replaceAll("_", " ")}
    </span>
  );
}
export function DataTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="data-table">
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((h) => (
              <TableHead key={h}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i}>
              {r.map((c, j) => (
                <TableCell key={j}>{c}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {rows.length === 0 && (
        <Blank
          title="Nothing here yet"
          description="Records will appear here when they are added."
        />
      )}
    </div>
  );
}
export function Confirm({
  open,
  onClose,
  onConfirm,
  title,
  description,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  description: string;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <AlertDialog open={open} onOpenChange={(v) => !v && !busy && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            onClick={async (e) => {
              e.preventDefault();
              setBusy(true);
              try {
                await onConfirm();
                onClose();
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Saving…" : "Confirm"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
export function download(name: string, content: string, type = "text/csv") {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
export function csv(rows: unknown[][]) {
  return rows
    .map((row) =>
      row
        .map(
          (c) =>
            '"' +
            String(c ?? "")
              .replace(/^[=+@-]/, "'$&")
              .replaceAll('"', '""') +
            '"',
        )
        .join(","),
    )
    .join("\r\n");
}

export function VULogo({ size = 40 }: { size?: number }) {
  const height = size;
  const width = Math.round(size * (80 / 46));
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 110 62"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="vu-gold-monogram-svg"
    >
      <defs>
        <linearGradient id="goldPlateGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FBE9AA" />
          <stop offset="25%" stopColor="#D4AF37" />
          <stop offset="60%" stopColor="#AA7C11" />
          <stop offset="100%" stopColor="#E5C158" />
        </linearGradient>
        <linearGradient id="goldTextGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFF4CD" />
          <stop offset="45%" stopColor="#E6C259" />
          <stop offset="100%" stopColor="#B38728" />
        </linearGradient>
        <filter id="plateShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.5" />
        </filter>
      </defs>

      {/* Gold Outer Bevel Frame */}
      <rect
        x="2"
        y="2"
        width="106"
        height="58"
        rx="2"
        fill="url(#goldPlateGrad)"
        filter="url(#plateShadow)"
      />
      {/* Dark Inner Plate */}
      <rect
        x="4.5"
        y="4.5"
        width="101"
        height="53"
        rx="1.5"
        fill="#0B233F"
        stroke="url(#goldPlateGrad)"
        strokeWidth="1"
      />

      {/* VU Monogram */}
      <path
        d="M 16 13 L 32 47 L 39 47 L 50 13 L 42 13 L 35 36 L 25 13 Z"
        fill="url(#goldTextGrad)"
      />
      <path
        d="M 47 13 L 55 13 L 55 36 C 55 41 59 44 66 44 C 73 44 77 41 77 36 L 77 13 L 85 13 L 85 36 C 85 47 75 50 66 50 C 56 50 47 47 47 36 Z"
        fill="url(#goldTextGrad)"
      />
      <rect x="88" y="13" width="7" height="37" fill="url(#goldTextGrad)" />
    </svg>
  );
}
