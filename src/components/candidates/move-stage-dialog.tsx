"use client";

import * as React from "react";
import { Candidate, CandidateStage, EmploymentType, OpenRole } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STAGES: CandidateStage[] = [
  "First Interview",
  "Second Interview",
  "Panel Interview",
  "Work Trial",
  "Reference Check",
  "Offer",
  "Hired",
  "Backup Pool",
  "Rejected",
  "Withdrawn",
];

const EMPLOYMENT_TYPES: EmploymentType[] = ["Full-time", "Part-time", "Contract", "Reliever", "Locum"];

const POOL_HINT: Partial<Record<EmploymentType, string>> = {
  Reliever: "They will be added to the Reliever Pool automatically.",
  Locum: "They will be added to the Locum Pool automatically.",
};

const ASSIGNABLE_STATUSES = new Set(["Open", "On Hold", "Allocated"]);

export function MoveStageDialog({
  candidate,
  openRoles,
  onOpenChange,
  onMove,
}: {
  candidate: Candidate | null;
  openRoles: OpenRole[];
  onOpenChange: (open: boolean) => void;
  onMove: (id: string, stage: CandidateStage, roleId?: string, employmentType?: EmploymentType) => void;
}) {
  const [stage, setStage] = React.useState<CandidateStage>(candidate?.stage ?? "First Interview");
  const [roleId, setRoleId] = React.useState("");
  const [employmentType, setEmploymentType] = React.useState<EmploymentType>(
    candidate?.employmentType ?? "Full-time"
  );

  React.useEffect(() => {
    if (candidate) {
      setStage(candidate.stage);
      setRoleId(candidate.roleId ?? "");
      setEmploymentType(candidate.employmentType ?? "Full-time");
    }
  }, [candidate]);

  const rolesForCandidate = React.useMemo(() => {
    if (!candidate) return [];
    return openRoles.filter(
      (r) =>
        ASSIGNABLE_STATUSES.has(r.status) &&
        (!candidate.segment || r.segment === candidate.segment) &&
        (!candidate.department || r.department === candidate.department)
    );
  }, [openRoles, candidate]);

  // IPS functions are open at many branches at once, so EditCandidateDialog
  // deliberately leaves the branch/role unset up to this point (see its
  // skipsAutoRole comment) — Hired is where that finally has to be pinned
  // down, since it's what updates the role's headcount-filled count. SO
  // roles aren't spread across branches the same way, so they keep the
  // existing optional behavior. Locums and Relievers float across branches
  // as needed rather than being tied to one open role, so neither is forced
  // to pick one even when hired.
  const isFloatingType = employmentType === "Locum" || employmentType === "Reliever";
  const roleRequired =
    stage === "Hired" && candidate?.segment === "IPS" && !isFloatingType;

  function handleSave() {
    if (!candidate) return;
    if (roleRequired && !roleId) return;
    onMove(
      candidate.id,
      stage,
      stage === "Hired" && roleId ? roleId : undefined,
      stage === "Hired" ? employmentType : undefined,
    );
    onOpenChange(false);
  }

  return (
    <Dialog open={!!candidate} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        {candidate && (
          <>
            <DialogHeader>
              <DialogTitle>Move {candidate.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Stage</Label>
                <Select value={stage} onValueChange={(v) => setStage(v as CandidateStage)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAGES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {stage === "Hired" && (
                <>
                  <div className="space-y-1.5">
                    <Label>
                      Hire Type
                    </Label>
                    <Select value={employmentType} onValueChange={(v) => setEmploymentType(v as EmploymentType)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {EMPLOYMENT_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {POOL_HINT[employmentType] && (
                      <p className="text-xs text-penda-blue">{POOL_HINT[employmentType]}</p>
                    )}
                  </div>

                  {!isFloatingType && (
                    <div className="space-y-1.5">
                      <Label>
                        Assign to Role
                        {roleRequired ? (
                          <span className="ml-1 text-xs text-destructive">(required for IPS hires)</span>
                        ) : (
                          <span className="ml-1 text-xs text-muted-foreground">(optional)</span>
                        )}
                      </Label>
                      <Select
                        value={roleId || "__none"}
                        onValueChange={(v) => setRoleId(v === "__none" ? "" : v)}
                      >
                        <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
                        <SelectContent>
                          {!roleRequired && <SelectItem value="__none">No role yet</SelectItem>}
                          {rolesForCandidate.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.title} · {r.location}
                            </SelectItem>
                          ))}
                          {rolesForCandidate.length === 0 && (
                            <SelectItem value="__empty" disabled>
                              No open roles for this segment / department
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Assigning a role will update its headcount filled count.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
            <DialogFooter>
              <Button
                onClick={handleSave}
                disabled={roleRequired && !roleId}
                className="bg-penda-blue hover:bg-penda-blue-dark"
              >
                Save
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
