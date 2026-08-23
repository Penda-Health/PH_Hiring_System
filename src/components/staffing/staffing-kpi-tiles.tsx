import { Card, CardContent } from "@/components/ui/card";
import { OrgSummary } from "@/lib/staffing/compute";

export function StaffingKpiTiles({ summary }: { summary: OrgSummary }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      <Tile label="Required HC" value={summary.required} />
      <Tile label="Current HC" value={summary.current} />
      <Tile label="Understaffed Cells" value={summary.understaffedCells} highlight={summary.understaffedCells > 0} />
      <Tile label="External Locum HC Needed" value={round1(summary.externalLocumHcNeeded)} />
      <Tile label="Not Yet Confirmed" value={summary.unconfirmed} muted={summary.unconfirmed > 0} />
    </div>
  );
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function Tile({ label, value, highlight, muted }: { label: string; value: number; highlight?: boolean; muted?: boolean }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p
          className={`text-2xl font-semibold tabular-nums ${
            highlight ? "text-critical-fg" : muted ? "text-muted-foreground" : ""
          }`}
        >
          {value}
        </p>
      </CardContent>
    </Card>
  );
}
