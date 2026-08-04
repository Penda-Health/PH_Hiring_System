"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Days blocked (0 = Sunday)
const BLOCKED_DAYS = new Set([0]);

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function addMonths(d: Date, n: number): Date {
  const result = new Date(d);
  result.setDate(1);
  result.setMonth(result.getMonth() + n);
  return result;
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Returns blank cells to pad the start of the month (0 = Mon, 6 = Sun). */
function leadingBlanks(year: number, month: number): number {
  const jsDay = new Date(year, month, 1).getDay(); // 0=Sun
  // Convert to Mon=0 ... Sun=6
  return (jsDay + 6) % 7;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function formatMonth(d: Date): string {
  return d.toLocaleDateString("en-KE", { month: "long", year: "numeric" });
}

interface DatePickerCalendarProps {
  value: string; // "YYYY-MM-DD" or ""
  onChange: (value: string) => void;
  /** Earliest selectable date. Defaults to tomorrow. */
  minDate?: Date;
  /** Latest selectable date. Defaults to 60 days from today. */
  maxDate?: Date;
  placeholder?: string;
  disabled?: boolean;
  error?: string | null;
}

export function DatePickerCalendar({
  value,
  onChange,
  minDate,
  maxDate,
  placeholder = "Pick a date",
  disabled = false,
  error,
}: DatePickerCalendarProps) {
  const tomorrow = React.useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const effectiveMin = minDate ?? tomorrow;
  const effectiveMax = React.useMemo(() => {
    if (maxDate) return maxDate;
    const d = new Date();
    d.setDate(d.getDate() + 60);
    return d;
  }, [maxDate]);

  const [open, setOpen] = React.useState(false);
  const [viewMonth, setViewMonth] = React.useState<Date>(() => {
    if (value) {
      const parsed = new Date(`${value}T00:00:00`);
      return startOfMonth(parsed);
    }
    return startOfMonth(effectiveMin);
  });

  const containerRef = React.useRef<HTMLDivElement>(null);

  // Close on outside click
  React.useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function isDisabledDay(year: number, month: number, day: number): boolean {
    const d = new Date(year, month, day);
    d.setHours(0, 0, 0, 0);
    const jsDay = d.getDay();
    if (BLOCKED_DAYS.has(jsDay)) return true;
    if (d < effectiveMin) return true;
    if (d > effectiveMax) return true;
    return false;
  }

  function handleDayClick(year: number, month: number, day: number) {
    if (isDisabledDay(year, month, day)) return;
    const dateStr = isoDate(new Date(year, month, day));
    onChange(dateStr);
    setOpen(false);
  }

  function handleToggle() {
    if (disabled) return;
    if (!open && value) {
      const parsed = new Date(`${value}T00:00:00`);
      setViewMonth(startOfMonth(parsed));
    }
    setOpen((v) => !v);
  }

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const totalDays = daysInMonth(year, month);
  const blanks = leadingBlanks(year, month);

  const displayValue = value
    ? new Date(`${value}T00:00:00`).toLocaleDateString("en-KE", {
        weekday: "short",
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const canGoPrev =
    addMonths(viewMonth, -1) >= startOfMonth(effectiveMin) ||
    viewMonth.getFullYear() > effectiveMin.getFullYear() ||
    viewMonth.getMonth() > effectiveMin.getMonth();

  const canGoNext = addMonths(viewMonth, 1) <= startOfMonth(effectiveMax);

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`flex h-10 w-full items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors
          ${error ? "border-destructive" : open ? "border-penda-teal ring-1 ring-penda-teal/30" : "border-input hover:border-penda-teal/50"}
          ${disabled ? "opacity-50 cursor-not-allowed bg-muted" : "bg-background cursor-pointer"}
          ${!displayValue ? "text-muted-foreground" : "text-foreground"}`}
      >
        <span>{displayValue ?? placeholder}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-muted-foreground shrink-0"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      </button>

      {/* Error hint */}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}

      {/* Calendar popup */}
      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-50 w-[300px] rounded-xl border border-border bg-card shadow-lg p-3">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setViewMonth((m) => addMonths(m, -1))}
              disabled={!canGoPrev}
              className="p-1 rounded-md hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold">{formatMonth(viewMonth)}</span>
            <button
              type="button"
              onClick={() => setViewMonth((m) => addMonths(m, 1))}
              disabled={!canGoNext}
              className="p-1 rounded-md hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Day-of-week header */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className={`text-center text-[11px] font-medium pb-1
                  ${d === "Sun" ? "text-muted-foreground/40" : "text-muted-foreground"}`}
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day grid */}
          <div className="grid grid-cols-7 gap-y-0.5">
            {/* Leading blanks */}
            {Array.from({ length: blanks }).map((_, i) => (
              <div key={`blank-${i}`} />
            ))}

            {/* Day cells */}
            {Array.from({ length: totalDays }, (_, i) => i + 1).map((day) => {
              const disabled = isDisabledDay(year, month, day);
              const dateStr = isoDate(new Date(year, month, day));
              const selected = dateStr === value;
              const isToday = dateStr === isoDate(new Date());
              // Sunday check for muted colour
              const isSunday = new Date(year, month, day).getDay() === 0;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleDayClick(year, month, day)}
                  disabled={disabled}
                  className={`
                    h-8 w-full rounded-md text-sm transition-colors relative
                    ${selected
                      ? "bg-penda-teal text-white font-semibold"
                      : disabled
                      ? "text-muted-foreground/30 cursor-not-allowed"
                      : isSunday
                      ? "text-muted-foreground/40 cursor-not-allowed"
                      : "hover:bg-penda-teal/10 hover:text-penda-teal"}
                    ${isToday && !selected ? "ring-1 ring-penda-teal/40" : ""}
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <p className="mt-3 text-[11px] text-muted-foreground text-center border-t border-border pt-2">
            Weekdays only · Mon – Sat available
          </p>
        </div>
      )}
    </div>
  );
}
