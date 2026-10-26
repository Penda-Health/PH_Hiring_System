"use client";

import * as React from "react";
import { Branch, Candidate, CandidateStage, EmploymentType, OpenRole } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
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

// Role-picker sentinel: hire into a branch that has no open role (Recruitment
// Manager only) — a one-seat role is created for it, see hireToBranch.
const TO_BRANCH = "__branch";

export type HireToBranchArgs = {
  branchId: string;
  title: string;
  employmentType: EmploymentType;
  expectedJoiningDate: string;
};

export function MoveStageDialog({
  candidate,
  openRoles,
  onOpenChange,
  onMove,
  branches = [],
  onHireToBranch,
}: {
  candidate: Candidate | null;
  openRoles: OpenRole[];
  /** With onHireToBranch, offers "a branch with no open role" in the role picker. */
  branches?: Branch[];
  onHireToBranch?: (id: string, args: HireToBranchArgs) => Promise<void>;
  onOpenChange: (open: boolean) => void;
  onMove: (
    id: string,
    stage: CandidateStage,
    roleId?: string,
    employmentType?: EmploymentType,
    expectedJoiningDate?: string
  ) => void;
}) {
  const [stage, setStage] = React.useState<CandidateStage>(candidate?.stage ?? "First Interview");
  const [roleId, setRoleId] = React.useState("");
  const [employmentType, setEmploymentType] = React.useState<EmploymentType>(
    candidate?.employmentType ?? "Full-time"
  );
  // Required for every hire — it's what the joining tracker (and the
  // "signed but didn't join" drop-off rate) is measured against.
  const [expectedJoiningDate, setExpectedJoiningDate] = React.useState("");
  const [branchId, setBranchId] = React.useState("");
  const [branchRoleTitle, setBranchRoleTitle] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (candidate) {
      setStage(candidate.stage);
      setRoleId(candidate.roleId ?? "");
      setEmploymentType(candidate.employmentType ?? "Full-time");
      setExpectedJoiningDate(candidate.expectedJoiningDate ?? "");
      setBranchId("");
      setBranchRoleTitle(candidate.department ?? "");
      setError(null);
    }
  }, [candidate]);

  const branchOptions = React.useMemo(
    () =>
      branches
        .filter((b) => b.active && (!candidate?.segment || b.segment === candidate.segment))
        .sort((a, b) => a.name.localeCompare(b.name)),
    [branches, candidate?.segment]
  );

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

  // Only when they're newly being hired — re-saving an existing hire keeps
  // its date (changed via "Update joining" instead).
  const joiningDateRequired = stage === "Hired" && candidate?.stage !== "Hired";

  // Only offered on a new hire — an existing hire already holds a seat.
  const canHireToBranch = !!onHireToBranch && stage === "Hired" && candidate?.stage !== "Hired" && !isFloatingType;
  const toBranch = canHireToBranch && roleId === TO_BRANCH;
  const missingRole = toBranch
    ? !branchId || !branchRoleTitle.trim()
    : roleRequired && (!roleId || roleId === TO_BRANCH);

  async function handleSave() {
    if (!candidate) return;
    if (missingRole) return;
    if (joiningDateRequired && !expectedJoiningDate) return;
    if (toBranch && onHireToBranch) {
      setSaving(true);
      setError(null);
      try {
        await onHireToBranch(candidate.id, { branchId, title: branchRoleTitle, employmentType, expectedJoiningDate });
        onOpenChange(false);
      } catch {
        setError("Couldn't create the role for that branch. Please try again.");
      } finally {
        setSaving(false);
      }
      return;
    }
    onMove(
      candidate.id,
      stage,
      stage === "Hired" && roleId && roleId !== TO_BRANCH ? roleId : undefined,
      stage === "Hired" ? employmentType : undefined,
      stage === "Hired" ? expectedJoiningDate : undefined,
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

              {joiningDateRequired && (
                <div className="space-y-1.5">
                  <Label htmlFor="expected-joining-date">
                    Expected joining date <span className="ml-1 text-xs text-destructive">(required)</span>
                  </Label>
                  <Input
                    id="expected-joining-date"
                    type="date"
                    value={expectedJoiningDate}
                    onChange={(e) => setExpectedJoiningDate(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Their joining is tracked as Pending until you mark them Joined or Did Not Join.
                  </p>
                </div>
              )}

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
                          {canHireToBranch && (
                            <SelectItem value={TO_BRANCH}>A branch with no open role…</SelectItem>
                          )}
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

                  {toBranch && (
                    <div className="space-y-3 rounded-md border border-penda-blue/30 bg-penda-blue/5 p-3">
                      <div className="space-y-1.5">
                        <Label>Branch</Label>
                        <Select value={branchId || undefined} onValueChange={setBranchId}>
                          <SelectTrigger><SelectValue placeholder="Select a branch" /></SelectTrigger>
                          <SelectContent>
                            {branchOptions.map((b) => (
                              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="branch-role-title">Role title</Label>
                        <Input
                          id="branch-role-title"
                          value={branchRoleTitle}
                          onChange={(e) => setBranchRoleTitle(e.target.value)}
                          placeholder="e.g. Clinical Officer"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        No requisition needed. A one-seat open role is created for this branch and tracked as a gap
                        until {candidate.name} is confirmed as reported.
                      </p>
                    </div>
                  )}
                  {error && <p className="text-sm text-destructive">{error}</p>}
                </>
              )}
            </div>
            <DialogFooter>
              <Button
                onClick={handleSave}
                disabled={missingRole || (joiningDateRequired && !expectedJoiningDate) || saving}
                className="bg-penda-blue hover:bg-penda-blue-dark"
              >
                {saving ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
