import type { CSSProperties } from "react";
import { Branch } from "@/types";
import { CADRES } from "@/lib/staffing/constants";
import { GapCell } from "@/lib/staffing/compute";

/**
 * "Actual Gaps on Track" — Branch × Cadre, live from Open Roles (hcApproved
 * minus hcFilled), styled after the source staffing-model spreadsheet this
 * replaces manual entry for: negative = still open, sorted worst-first by
 * Rank, with a heat tint per cell/column so the worst branches jump out.
 * Distinct from the heatmap above, which compares against the projected
 * staffing model's own Required/Current numbers instead.
 */
export function ActualGapsTable({
  branches,
  cells,
  onSelectCell,
}: {
  branches: Branch[];
  cells: GapCell[];
  onSelectCell: (cell: GapCell) => void;
}) {
  const cellByKey = new Map(cells.map((c) => [`${c.branchId}__${c.cadre}`, c]));

  const rows = branches
    .map((branch) => {
      const byCadre = CADRES.map((cadre) => cellByKey.get(`${branch.id}__${cadre}`));
      const total = byCadre.reduce((sum, c) => sum + (c?.actualGap ?? 0), 0);
      return { branch, byCadre, total };
    })
    .sort((a, b) => a.total - b.total); // most negative (worst) first

  const ranked = rows.map((r, i) => ({ ...r, rank: i + 1 }));

  const maxAbsByCadre = new Map(
    CADRES.map((cadre) => [
      cadre,
      Math.max(0.5, ...ranked.map((r) => Math.abs(r.byCadre.find((c) => c?.cadre === cadre)?.actualGap ?? 0))),
    ])
  );
  const maxAbsTotal = Math.max(0.5, ...ranked.map((r) => Math.abs(r.total)));

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
                  {cadre === "Clinical Officer" ? "Provider" : cadre}
                </th>
              ))}
              <th className="text-center font-medium text-muted-foreground px-3 py-2 whitespace-nowrap">
                Total Gap (HC)
              </th>
              <th className="text-center font-medium text-muted-foreground px-3 py-2 whitespace-nowrap">Rank</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map(({ branch, byCadre, total, rank }) => (
              <tr key={branch.id} className="border-t border-border">
                <td className="px-3 py-2 font-medium whitespace-nowrap sticky left-0 bg-background">{branch.name}</td>
                {CADRES.map((cadre, i) => {
                  const cell = byCadre[i];
                  const value = cell?.actualGap ?? 0;
                  return (
                    <td key={cadre} className="px-1.5 py-1.5">
                      <button
                        type="button"
                        disabled={!cell}
                        onClick={() => cell && onSelectCell(cell)}
                        title={cell ? `${branch.name} · ${cadre} · Actual gap ${value}` : undefined}
                        style={gapCellStyle(value, maxAbsByCadre.get(cadre) ?? 0.5)}
                        className="w-full min-w-[3.25rem] rounded-md border px-2 py-1.5 text-center text-sm font-medium tabular-nums transition-opacity hover:opacity-80 disabled:cursor-default"
                      >
                        {value === 0 ? "0" : value.toFixed(1)}
                      </button>
                    </td>
                  );
                })}
                <td className="px-1.5 py-1.5">
                  <div
                    style={gapCellStyle(total, maxAbsTotal)}
                    className="w-full min-w-[4rem] rounded-md border px-2 py-1.5 text-center text-sm font-semibold tabular-nums"
                  >
                    {total === 0 ? "0" : total.toFixed(1)}
                  </div>
                </td>
                <td className="px-3 py-2 text-center tabular-nums text-muted-foreground">{rank}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Negative = HC still open and being actively recruited (Open Roles&apos; approved minus filled headcount).
        Sorted worst-first by Rank; darker red = bigger gap. Click a cell for detail.
      </p>
    </div>
  );
}

// Red tint scaled by how large this cell's gap is relative to the worst
// value in its own column — mirrors the source spreadsheet's per-column
// conditional-formatting gradient rather than a single fixed threshold.
function gapCellStyle(value: number, maxAbs: number): CSSProperties {
  if (value === 0) {
    return {
      backgroundColor: "hsl(var(--muted))",
      borderColor: "transparent",
      color: "hsl(var(--muted-foreground))",
    };
  }
  const intensity = Math.min(1, Math.abs(value) / maxAbs);
  const alpha = 0.12 + intensity * 0.65;
  return {
    backgroundColor: `rgba(163, 45, 45, ${alpha})`,
    borderColor: "transparent",
    color: intensity > 0.55 ? "#ffffff" : "#A32D2D",
  };
}
