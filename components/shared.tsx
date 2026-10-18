"use client";
import { useState, useRef, useEffect, type ReactNode } from "react";
import {
  ChevronDown,
  Check,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  RotateCcw,
} from "lucide-react";
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
  width = 175,
  icon,
  className = "",
}: {
  values: string[];
  onChange: (v: string[]) => void;
  options: { value: string; label: string }[];
  label: string;
  allLabel?: string;
  width?: number | string;
  icon?: ReactNode;
  className?: string;
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

  const allSelected = values.length === 0 || values.includes("all");

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
    onChange(next);
  };

  const getButtonText = () => {
    if (allSelected || values.length === options.length) return allLabel;
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
    <div className="relative inline-block" ref={containerRef} style={{ position: "relative", userSelect: "none" }}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`choice toolbar-select-btn ${className} ${!allSelected ? "active" : ""} ${open ? "open" : ""}`}
        aria-label={label}
        style={{
          width,
          minWidth: width,
          maxWidth: width,
        }}
      >
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, overflow: "hidden", flex: 1 }}>
          {icon && (
            <div className={`toolbar-select-icon-box ${!allSelected ? "active" : ""}`}>
              {icon}
            </div>
          )}
          <span className="toolbar-select-text">
            {getButtonText()}
          </span>
        </div>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
          {!allSelected && values.length > 1 && (
            <span className="toolbar-select-badge">
              {values.length}
            </span>
          )}
          <ChevronDown
            size={14}
            className={`toolbar-select-chevron ${open ? "open" : ""}`}
          />
        </div>
      </button>

      {open && (
        <div className="toolbar-select-popover">
          {/* Option: All */}
          <div
            onClick={() => toggle("all")}
            className={`toolbar-select-option ${allSelected ? "selected" : ""}`}
          >
            <div className={`toolbar-select-checkbox ${allSelected ? "checked" : ""}`}>
              {allSelected && <Check size={12} strokeWidth={3} />}
            </div>
            <span>{allLabel}</span>
          </div>

          <div className="toolbar-select-divider" />

          {/* Individual Options with Checkboxes */}
          {options.map((opt) => {
            const isChecked = !allSelected && values.includes(opt.value);
            return (
              <div
                key={opt.value}
                onClick={() => toggle(opt.value)}
                className={`toolbar-select-option ${isChecked ? "selected" : ""}`}
              >
                <div className={`toolbar-select-checkbox ${isChecked ? "checked" : ""}`}>
                  {isChecked && <Check size={12} strokeWidth={3} />}
                </div>
                <span>{opt.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function formatDateDMY(d: string | number | Date | null | undefined): string {
  if (!d) return "-";
  if (typeof d === "string") {
    // If it's already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      const [y, m, day] = d.split("-");
      return `${day}/${m}/${y}`;
    }
    const date = new Date(d);
    if (!isNaN(date.getTime())) {
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    }
  }
  const date = new Date(d);
  if (isNaN(date.getTime())) return "-";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

export function DateRangePicker({
  from,
  to,
  onChange,
  placeholder = "All dates",
  width = 205,
}: {
  from: string;
  to: string;
  onChange: (dates: { from: string; to: string }) => void;
  placeholder?: string;
  width?: number | string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Staged dates while modal is open
  const [tempFrom, setTempFrom] = useState(from || "");
  const [tempTo, setTempTo] = useState(to || "");

  // Sync when props change or modal opens
  useEffect(() => {
    setTempFrom(from || "");
    setTempTo(to || "");
  }, [from, to, open]);

  // Calendar month view
  const getInitialMonth = () => {
    const base = from || to;
    if (base) {
      const [y, m] = base.split("-").map(Number);
      if (y && m) return new Date(y, m - 1, 1);
    }
    return new Date();
  };
  const [viewMonth, setViewMonth] = useState<Date>(getInitialMonth);

  useEffect(() => {
    if (open) {
      setViewMonth(getInitialMonth());
    }
  }, [open]);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    const handleDown = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleDown);
    return () => document.removeEventListener("mousedown", handleDown);
  }, [open]);

  // Step for calendar clicking: "from" | "to"
  const [selectingStep, setSelectingStep] = useState<"from" | "to">("from");
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  const prevMonth = () => {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1));
  };

  const goToToday = () => {
    const now = new Date();
    setViewMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  const pad = (n: number) => String(n).padStart(2, "0");
  const formatYMD = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

  const todayStr = formatYMD(new Date());

  // Button display text in Date/Month/Year format
  const getButtonText = () => {
    if (!from && !to) return placeholder;
    if (from && to) {
      if (from === to) return formatDateDMY(from);
      return `${formatDateDMY(from)} – ${formatDateDMY(to)}`;
    }
    if (from) return `From ${formatDateDMY(from)}`;
    if (to) return `Until ${formatDateDMY(to)}`;
    return placeholder;
  };

  const hasActive = Boolean(from || to);

  // Presets definition
  const presets = [
    { key: "all", label: "All Time" },
    { key: "today", label: "Today" },
    { key: "yesterday", label: "Yesterday" },
    { key: "7", label: "Last 7 Days" },
    { key: "month", label: "This Month" },
    { key: "30", label: "Last 30 Days" },
  ];

  const applyPreset = (presetKey: string) => {
    const now = new Date();
    let nextFrom = "";
    let nextTo = "";

    if (presetKey === "all") {
      nextFrom = "";
      nextTo = "";
    } else if (presetKey === "today") {
      nextFrom = formatYMD(now);
      nextTo = formatYMD(now);
    } else if (presetKey === "yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      nextFrom = formatYMD(y);
      nextTo = formatYMD(y);
    } else if (presetKey === "7") {
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      nextFrom = formatYMD(start);
      nextTo = formatYMD(now);
    } else if (presetKey === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      nextFrom = formatYMD(start);
      nextTo = formatYMD(now);
    } else if (presetKey === "30") {
      const start = new Date(now);
      start.setDate(start.getDate() - 29);
      nextFrom = formatYMD(start);
      nextTo = formatYMD(now);
    }

    setTempFrom(nextFrom);
    setTempTo(nextTo);
    onChange({ from: nextFrom, to: nextTo });
    setOpen(false);
  };

  const isPresetActive = (key: string) => {
    const now = new Date();
    if (key === "all") return !tempFrom && !tempTo;
    if (key === "today") return tempFrom === todayStr && tempTo === todayStr;
    if (key === "yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = formatYMD(y);
      return tempFrom === yStr && tempTo === yStr;
    }
    if (key === "7") {
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      return tempFrom === formatYMD(start) && tempTo === todayStr;
    }
    if (key === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return tempFrom === formatYMD(start) && tempTo === todayStr;
    }
    if (key === "30") {
      const start = new Date(now);
      start.setDate(start.getDate() - 29);
      return tempFrom === formatYMD(start) && tempTo === todayStr;
    }
    return false;
  };

  // Day click logic
  const handleDayClick = (dateStr: string) => {
    if (selectingStep === "from" || (tempFrom && tempTo)) {
      setTempFrom(dateStr);
      setTempTo("");
      setSelectingStep("to");
    } else {
      if (!tempFrom) {
        setTempFrom(dateStr);
        setTempTo("");
        setSelectingStep("to");
      } else if (dateStr < tempFrom) {
        setTempTo(tempFrom);
        setTempFrom(dateStr);
        setSelectingStep("from");
      } else {
        setTempTo(dateStr);
        setSelectingStep("from");
      }
    }
  };

  const handleApply = () => {
    let f = tempFrom;
    let t = tempTo;
    if (f && t && f > t) {
      const tmp = f;
      f = t;
      t = tmp;
    }
    if (f && !t) t = f;
    if (!f && t) f = t;
    onChange({ from: f, to: t });
    setOpen(false);
  };

  const handleClear = () => {
    setTempFrom("");
    setTempTo("");
    onChange({ from: "", to: "" });
    setOpen(false);
  };

  // Calendar dates calculation
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const startingDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sun
  const totalDaysInMonth = lastDayOfMonth.getDate();

  const days: { date: Date; dateStr: string; isCurrentMonth: boolean }[] = [];
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startingDayOfWeek - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevMonthLastDay - i);
    days.push({ date: d, dateStr: formatYMD(d), isCurrentMonth: false });
  }
  for (let i = 1; i <= totalDaysInMonth; i++) {
    const d = new Date(year, month, i);
    days.push({ date: d, dateStr: formatYMD(d), isCurrentMonth: true });
  }
  const remaining = (7 - (days.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(year, month + 1, i);
    days.push({ date: d, dateStr: formatYMD(d), isCurrentMonth: false });
  }

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const currentYear = new Date().getFullYear();
  const startYear = Math.min(2020, year - 4);
  const endYear = Math.max(currentYear + 4, year + 4);
  const years: number[] = [];
  for (let y = startYear; y <= endYear; y++) {
    years.push(y);
  }

  const weekDayHeaders = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  return (
    <div
      className="relative inline-block date-range-picker-container"
      ref={containerRef}
      style={{
        position: "relative",
        userSelect: "none",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`date-range-choice-btn ${hasActive ? "active" : ""} ${open ? "open" : ""}`}
        aria-label="Filter by date"
        style={{
          width,
          minWidth: width,
          maxWidth: width,
        }}
      >
        <div style={{ display: "inline-flex", alignItems: "center", gap: 9, overflow: "hidden" }}>
          <div className={`date-range-btn-icon ${hasActive ? "active" : ""}`}>
            <Calendar size={14} strokeWidth={2.2} />
          </div>
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontWeight: hasActive ? 600 : 500,
            }}
          >
            {getButtonText()}
          </span>
        </div>

        <div style={{ display: "inline-flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
          {hasActive ? (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              title="Clear date filter"
              className="date-range-clear-icon"
            >
              <X size={12} strokeWidth={2.5} />
            </span>
          ) : (
            <ChevronDown
              size={14}
              className={`date-range-chevron ${open ? "open" : ""}`}
            />
          )}
        </div>
      </button>

      {open && (
        <div className="date-range-popover">
          {/* Quick Preset Chips */}
          <div>
            <div
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "var(--muted-foreground)",
                marginBottom: 8,
              }}
            >
              Quick Presets
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {presets.map((p) => {
                const active = isPresetActive(p.key);
                return (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => applyPreset(p.key)}
                    className={`date-range-preset-pill ${active ? "active" : ""}`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ height: 1, background: "var(--border)", margin: "0 -2px" }} />

          {/* Month Header with Month & Year Select Dropdowns */}
          <div className="date-range-header-nav">
            <button
              type="button"
              onClick={prevMonth}
              className="date-range-nav-btn"
              title="Previous month"
            >
              <ChevronLeft size={16} />
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 6, flex: 1, justifyContent: "center" }}>
              {/* Month Dropdown */}
              <select
                value={month}
                onChange={(e) => setViewMonth(new Date(year, Number(e.target.value), 1))}
                className="date-picker-select"
                aria-label="Select month"
              >
                {monthNames.map((name, idx) => (
                  <option key={name} value={idx}>
                    {name}
                  </option>
                ))}
              </select>

              {/* Year Dropdown */}
              <select
                value={year}
                onChange={(e) => setViewMonth(new Date(Number(e.target.value), month, 1))}
                className="date-picker-select"
                aria-label="Select year"
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={goToToday}
                className="date-range-today-btn"
                title="Go to current month"
              >
                Today
              </button>
            </div>

            <button
              type="button"
              onClick={nextMonth}
              className="date-range-nav-btn"
              title="Next month"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Weekday Row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              textAlign: "center",
              fontSize: "0.72rem",
              fontWeight: 700,
              color: "var(--muted-foreground)",
              letterSpacing: "0.04em",
              paddingBottom: 2,
            }}
          >
            {weekDayHeaders.map((w, idx) => (
              <div key={idx}>{w}</div>
            ))}
          </div>

          {/* Days Grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(7, 1fr)",
              gap: "3px 0",
            }}
            onMouseLeave={() => setHoverDate(null)}
          >
            {days.map((item, idx) => {
              const { dateStr, isCurrentMonth } = item;
              const isStart = dateStr === tempFrom;
              const isEnd = dateStr === tempTo;
              const isSingle = isStart && (!tempTo || tempFrom === tempTo);
              const inRange =
                tempFrom && tempTo && dateStr > tempFrom && dateStr < tempTo;
              const inHoverRange =
                selectingStep === "to" &&
                tempFrom &&
                !tempTo &&
                hoverDate &&
                dateStr > tempFrom &&
                dateStr <= hoverDate;

              const isToday = dateStr === todayStr;

              let bg = "transparent";
              let color = isCurrentMonth
                ? "var(--foreground)"
                : "var(--muted-foreground)";
              let borderRadius = "7px";
              let fontWeight: any = isCurrentMonth ? 500 : 400;

              if (isStart || isEnd) {
                bg = "linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 85%, #1e40af))";
                color = "#ffffff";
                fontWeight = 700;
                if (!isSingle) {
                  if (isStart) {
                    borderRadius = "7px 0 0 7px";
                  } else {
                    borderRadius = "0 7px 7px 0";
                  }
                }
              } else if (inRange || inHoverRange) {
                bg = "color-mix(in srgb, var(--primary) 14%, transparent)";
                color = "var(--primary)";
                borderRadius = "0";
                fontWeight = 600;
              }

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleDayClick(dateStr)}
                  onMouseEnter={() => setHoverDate(dateStr)}
                  style={{
                    height: 33,
                    border: "none",
                    background: bg,
                    color,
                    borderRadius,
                    fontWeight,
                    fontSize: "0.8rem",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    opacity: isCurrentMonth ? 1 : 0.38,
                    padding: 0,
                    margin: 0,
                  }}
                  className="date-range-day-btn"
                >
                  <span>{item.date.getDate()}</span>
                  {isToday && !isStart && !isEnd && (
                    <span
                      style={{
                        position: "absolute",
                        bottom: 3,
                        width: 4,
                        height: 4,
                        borderRadius: "50%",
                        background: "var(--primary)",
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <div style={{ height: 1, background: "var(--border)", margin: "0 -2px" }} />

          {/* Selected Date Summary Card */}
          <div className="date-range-summary-card">
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Calendar size={13} style={{ color: "var(--primary)" }} />
              <span style={{ color: "var(--muted-foreground)", fontWeight: 550 }}>
                Selected:
              </span>
            </div>
            <span
              style={{
                fontWeight: 700,
                color: tempFrom ? "var(--primary)" : "var(--muted-foreground)",
              }}
            >
              {tempFrom && tempTo
                ? tempFrom === tempTo
                  ? formatDateDMY(tempFrom)
                  : `${formatDateDMY(tempFrom)} – ${formatDateDMY(tempTo)}`
                : tempFrom
                  ? `${formatDateDMY(tempFrom)} (Select end date)`
                  : "Click date on calendar"}
            </span>
          </div>

          {/* Footer Actions */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 2,
            }}
          >
            <button
              type="button"
              onClick={handleClear}
              className="date-range-reset-btn"
              title="Reset date filter to All Time"
            >
              <RotateCcw size={13} />
              Reset
            </button>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="date-range-cancel-btn"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="date-range-apply-btn"
              >
                <Check size={14} strokeWidth={2.5} />
                Apply Range
              </button>
            </div>
          </div>
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
  headers: (string | ReactNode)[];
  rows: ReactNode[][];
}) {
  return (
    <div
      className="data-table"
      style={{
        minHeight: "340px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
      }}
    >
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((h, i) => (
              <TableHead key={typeof h === "string" ? h : i}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r, i) => (
            <TableRow key={i} style={{ transition: "none", animation: "none" }}>
              {r.map((c, j) => (
                <TableCell key={j} style={{ transition: "none", animation: "none" }}>{c}</TableCell>
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

export interface TableActionButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  icon?: ReactNode;
  variant?: "order" | "payment" | "default";
}

export function TableActionButton({
  children,
  icon,
  className = "",
  variant = "order",
  type = "button",
  ...props
}: TableActionButtonProps) {
  return (
    <button
      type={type}
      className={`table-action-btn ${variant} ${className}`.trim()}
      {...props}
    >
      <span className="table-action-shimmer" aria-hidden="true" />
      {icon && <span className="table-action-icon">{icon}</span>}
      <span className="table-action-label">{children}</span>
    </button>
  );
}

// Backwards compatibility alias
export const GalaxyButton = TableActionButton;
