"use client";

import * as React from "react";
import { WorkTrial } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getDisplayStatus,
  getCandidateForTrial,
  getBranchForTrial,
  CULTURE_AUTO_FAIL_BELOW,
} from "@/lib/work-trial-helpers";
import { ScoreEntryDialog } from "./score-entry-dialog";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";
import { Check, ChevronDown, ClipboardCheck, Copy, Pencil, Trash2 } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  "Awaiting Arrival": "bg-muted text-muted-foreground border-transparent",
  "Awaiting Score":   "bg-high-bg text-high-fg border-transparent",
  Complete:           "bg-penda-teal-light text-penda-teal-dark border-transparent",
};

async function getFormLink(body: Record<string, unknown>): Promise<string> {
  const res = await fetch("/api/forms/get-link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to get link");
  }
  const { url } = await res.json();
  return url as string;
}

// ── Manual Review Dialog ─────────────────────────────────────────────────────
// Exported so the list view in work-trials/page.tsx can open it per-row.

type ReviewOutcome = "Pass" | "Fail" | "Did Not Attend";

export function ManualReviewDialog({
  trial,
  open,
  onOpenChange,
}: {
  trial: WorkTrial;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { candidates, branches, openRoles, updateWorkTrial, updateCandidateStage } = useRecruitmentData();
  const candidate = getCandidateForTrial(trial, candidates);
  const branch = getBranchForTrial(trial, branches);
  const role = openRoles.find((r) => r.id === (trial.roleId ?? candidate?.roleId));

  const [outcome, setOutcome] = React.useState<ReviewOutcome>(
    trial.arrivalMarked === false ? "Did Not Attend"
      : trial.passFail === "Pass" ? "Pass"
      : trial.passFail === "Fail" ? "Fail"
      : "Pass"
  );
  const [advanceStage, setAdvanceStage] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setOutcome(
        trial.arrivalMarked === false ? "Did Not Attend"
          : trial.passFail === "Pass" ? "Pass"
          : trial.passFail === "Fail" ? "Fail"
          : "Pass"
      );
      setAdvanceStage(false);
    }
  }, [open, trial]);

  const cultureAutoFail =
    trial.scoreCulture !== null &&
    trial.scoreCulture < CULTURE_AUTO_FAIL_BELOW;

  async function handleSave() {
    setSaving(true);
    try {
      const patch: Partial<WorkTrial> = {
        arrivalMarked: outcome === "Did Not Attend" ? false : true,
        passFail: outcome === "Pass" ? "Pass" : "Fail",
        formSubmittedAt: trial.formSubmittedAt ?? new Date().toISOString(),
        // Fill in a placeholder total of 0 so the record counts as "Complete"
        total: outcome === "Did Not Attend" ? 0 : (trial.total ?? 0),
      };
      updateWorkTrial(trial.id, patch);

      if (outcome === "Pass" && advanceStage && candidate) {
        updateCandidateStage(candidate.id, "Reference Check");
      }
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  const hasScores = trial.scoreTechnical !== null || trial.scorePatient !== null || trial.scoreCulture !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Manual Review</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Summary */}
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm space-y-0.5">
            <p className="font-medium">{candidate?.name ?? "Unknown candidate"}</p>
            {role && <p className="text-muted-foreground text-xs">{role.title}</p>}
            <p className="text-muted-foreground text-xs">
              {branch?.name ?? "No branch"} · {trial.date || "No date"}
            </p>
          </div>

          {/* Existing scores (if any) */}
          {hasScores && (
            <div className="rounded-lg border border-border divide-y divide-border text-sm">
              {trial.scoreCulture !== null && (
                <div className="flex justify-between px-3 py-2">
                  <span className="text-muted-foreground">Culture Fit (40%)</span>
                  <span className={cultureAutoFail ? "text-destructive font-semibold" : "font-medium"}>
                    {trial.scoreCulture / 10}/10
                    {cultureAutoFail && " — auto-fail"}
                  </span>
                </div>
              )}
              {trial.scorePatient !== null && (
                <div className="flex justify-between px-3 py-2">
                  <span className="text-muted-foreground">Patient Experience (30%)</span>
                  <span className="font-medium">{trial.scorePatient / 10}/10</span>
                </div>
              )}
              {trial.scoreTechnical !== null && (
                <div className="flex justify-between px-3 py-2">
                  <span className="text-muted-foreground">Technical Fit (30%)</span>
                  <span className="font-medium">{trial.scoreTechnical / 10}/10</span>
                </div>
              )}
              {trial.total !== null && (
                <div className="flex justify-between px-3 py-2 bg-muted/40">
                  <span className="font-medium">Total</span>
                  <span className="font-semibold">{trial.total}/100</span>
                </div>
              )}
            </div>
          )}

          {cultureAutoFail && (
            <p className="text-xs text-destructive rounded-md border border-destructive/20 bg-destructive/5 px-2 py-1.5">
              Culture Fit 6/10 or below — automatic fail rule applies.
            </p>
          )}

          {/* Outcome selector */}
          <div className="space-y-1.5">
            <Label>Outcome</Label>
            <Select
              value={outcome}
              onValueChange={(v) => {
                setOutcome(v as ReviewOutcome);
                if (v !== "Pass") setAdvanceStage(false);
              }}
              disabled={cultureAutoFail}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Pass" disabled={cultureAutoFail}>Pass</SelectItem>
                <SelectItem value="Fail">Fail</SelectItem>
                <SelectItem value="Did Not Attend">Did Not Attend</SelectItem>
              </SelectContent>
            </Select>
            {cultureAutoFail && (
              <p className="text-xs text-muted-foreground">Outcome locked to Fail due to culture auto-fail rule.</p>
            )}
          </div>

          {/* Advance stage toggle — only shown on Pass */}
          {outcome === "Pass" && !cultureAutoFail && (
            <label className="flex items-start gap-3 rounded-lg border border-penda-teal/30 bg-penda-teal/5 p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={advanceStage}
                onChange={(e) => setAdvanceStage(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-penda-teal"
              />
              <div>
                <p className="text-sm font-medium">Advance to Reference Checks</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Moves {candidate?.name ?? "this candidate"} to the Reference Check stage immediately.
                </p>
              </div>
            </label>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className={outcome === "Pass" && !cultureAutoFail ? "bg-penda-teal hover:bg-penda-teal-dark" : "bg-destructive hover:bg-destructive/90"}
          >
            {saving ? "Saving…" : `Mark as ${cultureAutoFail ? "Fail" : outcome}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Edit Details Dialog ───────────────────────────────────────────────────────

function EditWorkTrialDialog({
  trial,
  open,
  onOpenChange,
  onSave,
}: {
  trial: WorkTrial;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (patch: Partial<WorkTrial>) => void;
}) {
  const { branches } = useRecruitmentData();
  const [form, setForm] = React.useState({
    date: trial.date,
    branchId: trial.branchId,
    supervisor: trial.supervisor,
    arrivalMarked: trial.arrivalMarked,
  });

  React.useEffect(() => {
    if (open) {
      setForm({
        date: trial.date,
        branchId: trial.branchId,
        supervisor: trial.supervisor,
        arrivalMarked: trial.arrivalMarked,
      });
    }
  }, [open, trial]);

  function handleSave() {
    onSave(form);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Work Trial</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Branch</Label>
            <Select
              value={form.branchId || "__none"}
              onValueChange={(v) => {
                const branchId = v === "__none" ? "" : v;
                const branch = branches.find((b) => b.id === branchId);
                setForm((f) => ({
                  ...f,
                  branchId,
                  supervisor: branch?.branchManager ?? f.supervisor,
                }));
              }}
            >
              <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">Not assigned</SelectItem>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Supervisor</Label>
            <Input
              value={form.supervisor}
              onChange={(e) => setForm((f) => ({ ...f, supervisor: e.target.value }))}
              placeholder="Supervisor name"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Arrival</Label>
            <Select
              value={form.arrivalMarked === null ? "pending" : form.arrivalMarked ? "arrived" : "not-arrived"}
              onValueChange={(v) =>
                setForm((f) => ({
                  ...f,
                  arrivalMarked: v === "pending" ? null : v === "arrived",
                }))
              }
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="arrived">Arrived</SelectItem>
                <SelectItem value="not-arrived">Did Not Arrive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} className="bg-penda-teal hover:bg-penda-teal-dark">
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Work Trial Card ───────────────────────────────────────────────────────────

export function WorkTrialCard({
  trial,
  onSubmitScores,
  onUpdate,
  onDelete,
}: {
  trial: WorkTrial;
  onSubmitScores: (id: string, scores: { technical: number; patient: number; culture: number }) => void;
  onUpdate?: (id: string, patch: Partial<WorkTrial>) => void;
  onDelete?: (id: string) => void;
}) {
  const { candidates, branches, openRoles, canEdit } = useRecruitmentData();
  const [scoreDialogOpen, setScoreDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = React.useState(false);
  const [copied, setCopied] = React.useState<string | null>(null);
  const [linkError, setLinkError] = React.useState<string | null>(null);

  const candidate = getCandidateForTrial(trial, candidates);
  const branch    = getBranchForTrial(trial, branches);
  const role      = openRoles.find((r) => r.id === (trial.roleId ?? candidate?.roleId));
  const status    = getDisplayStatus(trial);
  const isOrphaned = !candidate;

  const pendingApproval = trial.formSubmittedAt && trial.submittedByRole === "Incharge" && !trial.bmApprovedAt;
  const cultureAutoFail = trial.scoreCulture !== null && trial.scoreCulture < CULTURE_AUTO_FAIL_BELOW;

  async function copyLink(type: "work-trial" | "bm-feedback") {
    setLinkError(null);
    try {
      const url = await getFormLink({ type, workTrialId: trial.id, candidateId: trial.candidateId });
      await navigator.clipboard.writeText(url);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : "Failed to copy link");
      setTimeout(() => setLinkError(null), 4000);
    }
  }

  function handleDelete() {
    if (!window.confirm("Delete this work trial record? This cannot be undone.")) return;
    onDelete?.(trial.id);
  }

  return (
    <>
      <Card className={isOrphaned ? "border-destructive/40" : undefined}>
        <CardHeader className="flex flex-row items-start justify-between pb-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base">
              {candidate?.name ?? <span className="text-destructive/80">Unlinked record</span>}
            </CardTitle>
            {role && (
              <p className="text-xs font-medium text-penda-teal/80">{role.title} · {role.department}</p>
            )}
            <p className="text-xs text-muted-foreground">
              {branch?.name ?? "No branch set"} · {trial.date || "No date set"}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {canEdit && !isOrphaned && onUpdate && (
              <button
                type="button"
                onClick={() => setEditDialogOpen(true)}
                title="Edit details"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            {isOrphaned && canEdit && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                title="Delete orphaned record"
                className="text-destructive/60 hover:text-destructive transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            <Badge className={STATUS_STYLES[status]}>{status}</Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {isOrphaned ? (
            <p className="text-xs text-destructive/70 rounded-md border border-destructive/20 bg-destructive/5 px-2 py-1.5">
              Candidate not found — this record may have been created with test data or the candidate was deleted.
            </p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                Supervisor: {trial.supervisor || <span className="italic">Not set</span>}
              </p>

              {trial.arrivalMarked !== null && (
                <p className="text-xs">
                  Arrival:{" "}
                  <span className={trial.arrivalMarked ? "text-penda-teal font-medium" : "text-destructive font-medium"}>
                    {trial.arrivalMarked ? "Arrived" : "Did not arrive"}
                  </span>
                </p>
              )}

              {pendingApproval && (
                <p className="text-xs rounded-md border border-amber-300/60 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 px-2 py-1.5">
                  Scores submitted by Incharge — pending BM approval
                </p>
              )}

              {cultureAutoFail && (
                <p className="text-xs rounded-md border border-destructive/20 bg-destructive/5 text-destructive px-2 py-1.5">
                  Culture Fit 6/10 or below — automatic fail
                </p>
              )}

              {status === "Complete" && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Score label="Culture Fit"         value={trial.scoreCulture} />
                  <Score label="Patient Experience"  value={trial.scorePatient} />
                  <Score label="Technical Fit"       value={trial.scoreTechnical} />
                  {trial.submittedByRole && (
                    <div className="flex items-center gap-1 text-muted-foreground col-span-2 mt-0.5">
                      <span>Scored by:</span>
                      <span className="font-medium text-foreground">{trial.submittedByRole}</span>
                      {trial.bmApprovedAt && <span className="text-penda-teal">· BM approved</span>}
                    </div>
                  )}
                  <div className="col-span-2 flex items-center justify-between rounded-md border border-border p-2 mt-1">
                    <span className="font-medium">Total</span>
                    <Badge variant={trial.passFail === "Pass" ? "ips" : "critical"}>
                      {trial.total} — {trial.passFail}
                    </Badge>
                  </div>
                </div>
              )}

              {(trial.reminder12hSent || trial.escalation24hSent) && (
                <div className="flex gap-2 flex-wrap">
                  {trial.reminder12hSent   && <Badge variant="outline">12h reminder sent</Badge>}
                  {trial.escalation24hSent && <Badge variant="outline">24h escalation sent</Badge>}
                </div>
              )}

              {linkError && (
                <p className="text-xs text-destructive rounded-md border border-destructive/20 bg-destructive/5 px-2 py-1.5">
                  {linkError}
                </p>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                {/* Manual review — shown when no formal score yet */}
                {canEdit && status !== "Complete" && !pendingApproval && (
                  <Button size="sm" variant="outline" onClick={() => setReviewDialogOpen(true)} className="gap-1">
                    <ClipboardCheck className="h-3.5 w-3.5" />
                    Review
                  </Button>
                )}
                {/* Score via dialog — for in-app scoring */}
                {canEdit && status !== "Complete" && !pendingApproval && (
                  <Button size="sm" variant="outline" onClick={() => setScoreDialogOpen(true)}>
                    Submit Scores
                  </Button>
                )}
                {/* Quick review on complete trials (to advance stage) */}
                {canEdit && status === "Complete" && (
                  <Button size="sm" variant="outline" onClick={() => setReviewDialogOpen(true)} className="gap-1">
                    <ClipboardCheck className="h-3.5 w-3.5" />
                    Review &amp; Advance
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-1">
                      <Copy className="h-3.5 w-3.5" />
                      Copy link
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem onClick={() => copyLink("bm-feedback")}>
                      {copied === "bm-feedback" ? <Check className="h-3.5 w-3.5 mr-2 text-penda-teal" /> : <Copy className="h-3.5 w-3.5 mr-2" />}
                      BM / Incharge scoring link
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => copyLink("work-trial")}>
                      {copied === "work-trial" ? <Check className="h-3.5 w-3.5 mr-2 text-penda-teal" /> : <Copy className="h-3.5 w-3.5 mr-2" />}
                      Candidate confirmation link
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <ScoreEntryDialog
        open={scoreDialogOpen}
        onOpenChange={setScoreDialogOpen}
        onSubmit={(scores) => onSubmitScores(trial.id, scores)}
      />

      {onUpdate && (
        <EditWorkTrialDialog
          trial={trial}
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSave={(patch) => onUpdate(trial.id, patch)}
        />
      )}

      <ManualReviewDialog
        trial={trial}
        open={reviewDialogOpen}
        onOpenChange={setReviewDialogOpen}
      />
    </>
  );
}

function Score({ label, value }: { label: string; value: number | null }) {
  const display = value !== null ? `${(value / 10).toFixed(1)}/10` : "—";
  return (
    <div className="flex items-center justify-between rounded-md bg-muted px-2 py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{display}</span>
    </div>
  );
}
