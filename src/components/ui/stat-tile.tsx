import * as React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Tone follows the same meaning these status colors already carry elsewhere
 * in the app (see STATUS_BADGE on the Work Trials page and STATUS_STYLES /
 * OUTCOME_STYLES in reference-check-helpers.ts) — never invent a new color
 * for a state these badges already define.
 */
export type StatTileTone = "neutral" | "accent" | "warning" | "critical" | "success";

const TONE_STYLES: Record<StatTileTone, { chip: string; value: string }> = {
  neutral: { chip: "bg-muted text-muted-foreground", value: "text-foreground" },
  accent: { chip: "bg-penda-blue-light text-penda-blue-dark", value: "text-penda-blue-dark" },
  warning: { chip: "bg-high-bg text-high-fg", value: "text-high-fg" },
  critical: { chip: "bg-critical-bg text-critical-fg", value: "text-critical-fg" },
  success: { chip: "bg-success-bg text-success-fg", value: "text-success-fg" },
};

export interface StatTileProps {
  label: string;
  value: React.ReactNode;
  /** Optional breakdown/context line under the value, e.g. "42 pass · 6 fail". */
  sublabel?: React.ReactNode;
  tone?: StatTileTone;
  icon?: LucideIcon;
  className?: string;
}

/**
 * A single headline-number KPI tile — label, big value, optional breakdown.
 * Reuses this app's existing `glass-card` surface so a stats row matches the
 * rest of the dashboard rather than introducing a second card style.
 */
export function StatTile({ label, value, sublabel, tone = "neutral", icon: Icon, className }: StatTileProps) {
  const styles = TONE_STYLES[tone];
  return (
    <div className={cn("glass-card flex flex-col gap-1.5 p-4", className)}>
      <div className="flex items-center gap-2">
        {Icon && (
          <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md", styles.chip)}>
            <Icon className="h-3.5 w-3.5" />
          </span>
        )}
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <span className={cn("text-2xl font-semibold leading-none", styles.value)}>{value}</span>
      {sublabel && <span className="text-xs text-muted-foreground">{sublabel}</span>}
    </div>
  );
}

export function StatTileRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5", className)}>{children}</div>;
}
