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
} from "@/lib/work-trial-helpers";
import { ScoreEntryDialog } from "./score-entry-dialog";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";
import { Check, ChevronDown, Copy, Pencil, Trash2 } from "lucide-react";

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
  const [copied, setCopied] = React.useState<string | null>(null);
  const [linkError, setLinkError] = React.useState<string | null>(null);

  const candidate = getCandidateForTrial(trial, candidates);
  const branch    = getBranchForTrial(trial, branches);
  const role      = openRoles.find((r) => r.id === (trial.roleId ?? candidate?.roleId));
  const status    = getDisplayStatus(trial);
  const isOrphaned = !candidate;

  const pendingApproval = trial.formSubmittedAt && trial.submittedByRole === "Incharge" && !trial.bmApprovedAt;

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

              {status === "Complete" && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <Score label="Technical Fit"       value={trial.scoreTechnical} />
                  <Score label="Patient Experience"  value={trial.scorePatient} />
                  <Score label="Culture Fit"         value={trial.scoreCulture} />
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
                {status !== "Complete" && !pendingApproval && (
                  <Button size="sm" variant="outline" onClick={() => setScoreDialogOpen(true)}>
                    Submit Scores
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
    </>
  );
}

function Score({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-muted px-2 py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value ?? "—"}</span>
    </div>
  );
}
