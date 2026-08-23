"use client";

import * as React from "react";
import { StaffingProjection } from "@/types";
import { useAuth } from "@/lib/auth/auth-context";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";
import { listResource, createResource, updateResource } from "@/lib/airtable/browser-api";
import { buildGapMatrix, summarizeByCadre, summarizeOrg, GapCell } from "@/lib/staffing/compute";
import { pipelineForCell } from "@/lib/staffing/pipeline";
import { currentMonthKey, nextMonthKey, formatMonthLabel } from "@/lib/staffing/constants";
import { StaffingKpiTiles } from "@/components/staffing/staffing-kpi-tiles";
import { StaffingHeatmap } from "@/components/staffing/staffing-heatmap";
import { StaffingCellDialog } from "@/components/staffing/staffing-cell-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function StaffingPage() {
  const { user } = useAuth();
  const { branches, openRoles, candidates, offers, canEdit } = useRecruitmentData();

  const thisMonth = React.useMemo(() => currentMonthKey(), []);
  const nextMonth = React.useMemo(() => nextMonthKey(thisMonth), [thisMonth]);
  const [monthKey, setMonthKey] = React.useState(nextMonth);
  const [branchFilter, setBranchFilter] = React.useState<"All" | string>("All");

  const [projections, setProjections] = React.useState<StaffingProjection[]>([]);
  const [loadingProjections, setLoadingProjections] = React.useState(true);
  const [selectedCell, setSelectedCell] = React.useState<GapCell | null>(null);
  const [saving, setSaving] = React.useState(false);

  const loadProjections = React.useCallback(async () => {
    try {
      const rows = await listResource<StaffingProjection>("staffing-projections");
      setProjections(rows);
    } catch (err) {
      console.error("Failed to load staffing projections:", err);
    } finally {
      setLoadingProjections(false);
    }
  }, []);

  React.useEffect(() => {
    loadProjections();
  }, [loadProjections]);

  const ipsBranches = React.useMemo(
    () => branches.filter((b) => b.segment === "IPS" && b.active).sort((a, b) => a.name.localeCompare(b.name)),
    [branches]
  );

  const allCells = React.useMemo(
    () => buildGapMatrix(branches, openRoles, projections, monthKey),
    [branches, openRoles, projections, monthKey]
  );

  const visibleBranches = branchFilter === "All" ? ipsBranches : ipsBranches.filter((b) => b.id === branchFilter);
  const visibleCells =
    branchFilter === "All" ? allCells : allCells.filter((c) => c.branchId === branchFilter);

  const orgSummary = React.useMemo(() => summarizeOrg(allCells), [allCells]);
  const cadreSummaries = React.useMemo(() => summarizeByCadre(allCells), [allCells]);

  const pipeline = React.useMemo(() => {
    if (!selectedCell) return [];
    return pipelineForCell(selectedCell.branchId, selectedCell.cadre, monthKey, candidates, openRoles, offers);
  }, [selectedCell, monthKey, candidates, openRoles, offers]);

  async function handleSave(currentStaffingHc: number, notes: string) {
    if (!selectedCell) return;
    setSaving(true);
    try {
      const updatedBy = user?.name || user?.email || "Unknown";
      const updatedAt = new Date().toISOString();
      const payload: Partial<StaffingProjection> = {
        month: monthKey,
        branchId: selectedCell.branchId,
        cadre: selectedCell.cadre,
        currentStaffingHc,
        notes: notes || undefined,
        updatedBy,
        updatedAt,
      };
      if (selectedCell.projectionId) {
        await updateResource<StaffingProjection>("staffing-projections", selectedCell.projectionId, payload);
      } else {
        await createResource<StaffingProjection>("staffing-projections", payload);
      }
      await loadProjections();
      setSelectedCell(null);
    } catch (err) {
      console.error("Failed to save Current Staffing HC:", err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Staffing Projections</h1>
        <p className="text-sm text-muted-foreground">
          Confirmed Current Staffing HC vs. Required HC (Open Roles&apos; approved headcount), per IPS branch and
          cadre — cross-referenced against the live hiring pipeline. Surfaces the gap; doesn&apos;t write anything
          back to Open Roles or Requisitions.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1.5">
          <Button
            variant={monthKey === thisMonth ? "default" : "outline"}
            size="sm"
            className={monthKey === thisMonth ? "bg-penda-blue hover:bg-penda-blue-dark" : ""}
            onClick={() => setMonthKey(thisMonth)}
          >
            {formatMonthLabel(thisMonth)}
          </Button>
          <Button
            variant={monthKey === nextMonth ? "default" : "outline"}
            size="sm"
            className={monthKey === nextMonth ? "bg-penda-blue hover:bg-penda-blue-dark" : ""}
            onClick={() => setMonthKey(nextMonth)}
          >
            {formatMonthLabel(nextMonth)}
          </Button>
        </div>

        <Select value={branchFilter} onValueChange={setBranchFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Branch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Branches</SelectItem>
            {ipsBranches.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <StaffingKpiTiles summary={orgSummary} />

      <Card>
        <CardContent className="py-4">
          <p className="text-xs font-medium text-muted-foreground mb-3">Gap by cadre — {formatMonthLabel(monthKey)}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-1.5 pr-3 font-medium">Cadre</th>
                  <th className="py-1.5 px-3 font-medium text-right">Required</th>
                  <th className="py-1.5 px-3 font-medium text-right">Current</th>
                  <th className="py-1.5 px-3 font-medium text-right">Gap</th>
                  <th className="py-1.5 px-3 font-medium text-right">Ext. Locum HC Needed</th>
                  <th className="py-1.5 pl-3 font-medium text-right">Not Confirmed</th>
                </tr>
              </thead>
              <tbody>
                {cadreSummaries.map((s) => (
                  <tr key={s.cadre} className="border-t border-border">
                    <td className="py-1.5 pr-3 font-medium">{s.cadre}</td>
                    <td className="py-1.5 px-3 text-right tabular-nums">{s.required}</td>
                    <td className="py-1.5 px-3 text-right tabular-nums">{s.current}</td>
                    <td
                      className={`py-1.5 px-3 text-right tabular-nums font-medium ${
                        s.gapHc < 0 ? "text-critical-fg" : ""
                      }`}
                    >
                      {s.gapHc}
                    </td>
                    <td className="py-1.5 px-3 text-right tabular-nums">{Math.round(s.externalLocumHcNeeded * 10) / 10}</td>
                    <td className="py-1.5 pl-3 text-right tabular-nums text-muted-foreground">{s.unconfirmed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="py-4">
          <p className="text-xs font-medium text-muted-foreground mb-3">
            Branch × Cadre — {formatMonthLabel(monthKey)}
          </p>
          {loadingProjections ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Loading…</p>
          ) : (
            <StaffingHeatmap branches={visibleBranches} cells={visibleCells} onSelectCell={setSelectedCell} />
          )}
        </CardContent>
      </Card>

      <StaffingCellDialog
        cell={selectedCell}
        monthKey={monthKey}
        pipeline={pipeline}
        canEdit={canEdit}
        saving={saving}
        onOpenChange={(open) => !open && setSelectedCell(null)}
        onSave={handleSave}
      />
    </div>
  );
}

