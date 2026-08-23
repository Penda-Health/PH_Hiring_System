"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { GapCell, GapStatus } from "@/lib/staffing/compute";
import { PipelineCandidate } from "@/lib/staffing/pipeline";
import { formatMonthLabel } from "@/lib/staffing/constants";

const STATUS_BADGE_VARIANT: Record<GapStatus, "critical" | "success" | "so" | "outline"> = {
  "no-data": "outline",
  understaffed: "critical",
  balanced: "success",
  overstaffed: "so",
};

const STATUS_LABELS: Record<GapStatus, string> = {
  "no-data": "Not yet confirmed",
  understaffed: "Understaffed",
  balanced: "Balanced",
  overstaffed: "Overstaffed",
};

export function StaffingCellDialog({
  cell,
  monthKey,
  pipeline,
  canEdit,
  saving,
  onOpenChange,
  onSave,
}: {
  cell: GapCell | null;
  monthKey: string;
  pipeline: PipelineCandidate[];
  canEdit: boolean;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (currentStaffingHc: number, notes: string) => void;
}) {
  const [hcInput, setHcInput] = React.useState("");
  const [notesInput, setNotesInput] = React.useState("");

  React.useEffect(() => {
    if (!cell) return;
    setHcInput(cell.current !== undefined ? String(cell.current) : "");
    setNotesInput(cell.notes ?? "");
  }, [cell]);

  if (!cell) return null;

  const parsedHc = parseFloat(hcInput);
  const canSubmit = hcInput.trim() !== "" && !isNaN(parsedHc) && parsedHc >= 0;

  return (
    <Dialog open={!!cell} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {cell.branchName} · {cell.cadre}
          </DialogTitle>
          <DialogDescription>{formatMonthLabel(monthKey)}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_BADGE_VARIANT[cell.status]}>{STATUS_LABELS[cell.status]}</Badge>
            {cell.updatedBy && (
              <span className="text-xs text-muted-foreground">
                Last confirmed by {cell.updatedBy}
                {cell.updatedAt ? ` on ${new Date(cell.updatedAt).toLocaleDateString("en-GB")}` : ""}
              </span>
            )}
          </div>

          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Stat label="Required HC" value={cell.required} />
            <Stat label="Current HC" value={cell.current ?? "–"} />
            {cell.status !== "no-data" && (
              <>
                <Stat label="Adjustment" value={cell.adjustment ?? 0} />
                <Stat label="External Locum HC Needed" value={round1(cell.externalLocumHcNeeded)} />
              </>
            )}
          </dl>

          {cell.status === "understaffed" && (
            <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
              <p>Hours shortfall: {round1(cell.hoursShortfall)} hrs</p>
              <p>Internal locum hours available: {round1(cell.internalLocumHours)} hrs</p>
              <p>Unallocated hours (needs external locum): {round1(cell.unallocatedHours)} hrs</p>
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-muted-foreground mb-1.5">
              In pipeline for this role ({pipeline.length})
            </p>
            {pipeline.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active candidates against this branch/cadre.</p>
            ) : (
              <ul className="space-y-1.5">
                {pipeline.map(({ candidate, role, startsThisMonth }) => (
                  <li key={candidate.id} className="flex items-center justify-between text-sm">
                    <span>
                      {candidate.name} <span className="text-muted-foreground">— {role.title}</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Badge variant="outline">{candidate.stage}</Badge>
                      {startsThisMonth && <Badge variant="success">Starts this month</Badge>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {canEdit && (
            <div className="border-t border-border pt-4 space-y-3">
              <p className="text-xs font-medium text-muted-foreground">Confirm Current Staffing HC</p>
              <div className="flex items-end gap-3">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="current-hc" className="text-xs">
                    Current Staffing HC
                  </Label>
                  <Input
                    id="current-hc"
                    type="number"
                    step={0.5}
                    min={0}
                    value={hcInput}
                    onChange={(e) => setHcInput(e.target.value)}
                    placeholder="e.g. 1.5"
                  />
                </div>
                <Button
                  disabled={!canSubmit || saving}
                  onClick={() => onSave(parsedHc, notesInput.trim())}
                >
                  {saving ? "Saving…" : "Save"}
                </Button>
              </div>
              <div className="space-y-1">
                <Label htmlFor="hc-notes" className="text-xs">
                  Notes (e.g. maternity leave exclusions)
                </Label>
                <Textarea
                  id="hc-notes"
                  value={notesInput}
                  onChange={(e) => setNotesInput(e.target.value)}
                  rows={2}
                  placeholder="Optional"
                />
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-base font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
