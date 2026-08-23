import { Branch } from "@/types";
import { CADRES } from "@/lib/staffing/constants";
import { GapCell, GapStatus } from "@/lib/staffing/compute";
import { cn } from "@/lib/utils";

// Reuses the app's existing semantic badge tokens rather than inventing a
// new palette: critical/success already mean exactly "understaffed" /
// "on target" everywhere else in the app. "Overstaffed" borrows the "so"
// (Support Office) blue pair purely for its hue — this page is IPS-only, so
// that token never collides with its usual segment meaning here.
const STATUS_STYLES: Record<GapStatus, string> = {
  "no-data": "bg-muted/50 text-muted-foreground border-border",
  understaffed: "bg-critical-bg text-critical-fg border-transparent",
  balanced: "bg-success-bg text-success-fg border-transparent",
  overstaffed: "bg-so-bg text-so-fg border-transparent",
};

const STATUS_LABELS: Record<GapStatus, string> = {
  "no-data": "Not yet confirmed",
  understaffed: "Understaffed",
  balanced: "Balanced",
  overstaffed: "Overstaffed",
};

function cellLabel(cell: GapCell): string {
  if (cell.status === "no-data") return "–";
  const adj = cell.adjustment ?? 0;
  const sign = adj > 0 ? "+" : "";
  return `${sign}${adj}`;
}

export function StaffingHeatmap({
  branches,
  cells,
  onSelectCell,
}: {
  branches: Branch[];
  cells: GapCell[];
  onSelectCell: (cell: GapCell) => void;
}) {
  const cellByKey = new Map(cells.map((c) => [`${c.branchId}__${c.cadre}`, c]));

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/40">
              <th className="text-left font-medium text-muted-foreground px-3 py-2 sticky left-0 bg-muted/40">
                Branch
              </th>
              {CADRES.map((cadre) => (
                <th key={cadre} className="text-center font-medium text-muted-foreground px-3 py-2 whitespace-nowrap">
                  {cadre}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {branches.map((branch) => (
              <tr key={branch.id} className="border-t border-border">
                <td className="px-3 py-2 font-medium whitespace-nowrap sticky left-0 bg-background">{branch.name}</td>
                {CADRES.map((cadre) => {
                  const cell = cellByKey.get(`${branch.id}__${cadre}`);
                  if (!cell) return <td key={cadre} className="px-3 py-2" />;
                  return (
                    <td key={cadre} className="px-1.5 py-1.5">
                      <button
                        type="button"
                        onClick={() => onSelectCell(cell)}
                        title={`${branch.name} · ${cadre} · ${STATUS_LABELS[cell.status]}${
                          cell.status !== "no-data" ? ` · required ${cell.required}, current ${cell.current}` : ""
                        }`}
                        className={cn(
                          "w-full min-w-[3.5rem] rounded-md border px-2 py-1.5 text-center text-sm font-medium tabular-nums transition-colors hover:opacity-80",
                          STATUS_STYLES[cell.status]
                        )}
                      >
                        {cellLabel(cell)}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Legend:</span>
        {(Object.keys(STATUS_LABELS) as GapStatus[]).map((status) => (
          <span key={status} className="flex items-center gap-1.5">
            <span className={cn("h-3 w-3 rounded-sm border", STATUS_STYLES[status])} />
            {STATUS_LABELS[status]}
          </span>
        ))}
        <span>— cell value is Current minus Required HC; click a cell for detail.</span>
      </div>
    </div>
  );
}
