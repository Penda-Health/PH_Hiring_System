import { ClipboardList, CheckCircle2, AlertTriangle, ShieldAlert, Flame } from "lucide-react";
import { KpiStrip, type KpiTileData } from "@/components/dashboard/kpi-strip";
import { IpsAllocation } from "@/lib/supabase/ips-meetings";

export function SummaryBar({ allocations, unmappedCount }: { allocations: IpsAllocation[]; unmappedCount: number }) {
  const total = allocations.length;
  const allocated = allocations.filter((a) => a.candidateId).length;
  const unallocated = total - allocated;
  const criticalUnfilled = allocations.filter((a) => !a.candidateId && a.priority === "Critical").length;
  const highUnfilled = allocations.filter((a) => !a.candidateId && a.priority === "High").length;

  const tiles: KpiTileData[] = [
    { label: "Total Slots", value: String(total), icon: ClipboardList, accent: "blue" },
    { label: "Allocated", value: String(allocated), icon: CheckCircle2, accent: "teal" },
    { label: "Unallocated", value: String(unallocated), icon: AlertTriangle, accent: "amber" },
    { label: "Critical Unfilled", value: String(criticalUnfilled), icon: Flame, accent: "rose" },
    { label: "High Unfilled", value: String(highUnfilled), icon: ShieldAlert, accent: "amber" },
  ];

  return (
    <div className="space-y-2">
      <KpiStrip tiles={tiles} columns={4} />
      {unmappedCount > 0 && (
        <p className="text-xs text-muted-foreground">
          {unmappedCount} open IPS role{unmappedCount === 1 ? "" : "s"} excluded — no role-group mapping yet.
        </p>
      )}
    </div>
  );
}
