import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type Accent = "teal" | "blue" | "amber" | "rose";

const ACCENT_STYLES: Record<Accent, { bg: string; fg: string }> = {
  teal: { bg: "bg-penda-teal-light/60", fg: "text-penda-teal-dark" },
  blue: { bg: "bg-so-bg", fg: "text-so-fg" },
  amber: { bg: "bg-high-bg", fg: "text-high-fg" },
  rose: { bg: "bg-critical-bg", fg: "text-critical-fg" },
};

const COLUMN_STYLES = {
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
} as const;

export interface KpiTileData {
  label: string;
  value: string;
  sublabel?: string;
  icon: LucideIcon;
  accent?: Accent;
}

function KpiTile({ label, value, sublabel, icon: Icon, accent = "teal" }: KpiTileData) {
  const style = ACCENT_STYLES[accent];
  return (
    <Card title={sublabel}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", style.bg)}>
          <Icon className={cn("h-5 w-5", style.fg)} />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-semibold leading-tight">{value}</p>
          <p className="text-xs text-muted-foreground truncate">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function KpiStrip({ tiles, columns = 4 }: { tiles: KpiTileData[]; columns?: 3 | 4 }) {
  return <div className={cn("grid gap-3", COLUMN_STYLES[columns])}>{tiles.map((tile) => (
    <KpiTile key={tile.label} {...tile} />
  ))}</div>;
}
