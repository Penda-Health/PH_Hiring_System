"use client";

import * as React from "react";
import { WorkTrial } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Check, ChevronDown, Copy, Trash2 } from "lucide-react";

const STATUS_STYLES: Record<string, string> = {
  "Awaiting Arrival": "bg-muted text-muted-foreground border-transparent",
  "Awaiting Score": "bg-high-bg text-high-fg border-transparent",
  Complete: "bg-penda-teal-light text-penda-teal-dark border-transparent",
};

async function getFormLink(body: Record<string, unknown>): Promise<string> {
  const res = await fetch("/api/forms/get-link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Failed to get link");
  const { url } = await res.json();
  return url as string;
}

export function WorkTrialCard({
  trial,
  onSubmitScores,
  onDelete,
}: {
  trial: WorkTrial;
  onSubmitScores: (id: string, scores: { technical: number; patient: number; safety: number; culture: number }) => void;
  onDelete?: (id: string) => void;
}) {
  const { candidates, branches, openRoles, canEdit } = useRecruitmentData();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [copied, setCopied] = React.useState<string | null>(null);
  const candidate = getCandidateForTrial(trial, candidates);
  const branch = getBranchForTrial(trial, branches);
  const role = openRoles.find((r) => r.id === (trial.roleId ?? candidate?.roleId));
  const status = getDisplayStatus(trial);
  const isOrphaned = !candidate;

  async function copyLink(type: "work-trial" | "bm-feedback") {
    try {
      const url = await getFormLink({ type, workTrialId: trial.id, candidateId: trial.candidateId });
      await navigator.clipboard.writeText(url);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // fallback: show the url in prompt
    }
  }

  function handleDelete() {
    if (!window.confirm("Delete this work trial record? This cannot be undone.")) return;
    onDelete?.(trial.id);
  }

  return (
    <Card className={isOrphaned ? "border-destructive/40" : undefined}>
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div className="flex-1 min-w-0">
          <CardTitle className="text-base">
            {candidate?.name ?? (
              <span className="text-destructive/80">Unlinked record</span>
            )}
          </CardTitle>
          {role && <p className="text-xs font-medium text-penda-teal/80">{role.title} · {role.department}</p>}
          <p className="text-xs text-muted-foreground">{branch?.name ?? "No branch"} · {trial.date || "No date"}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {isOrphaned && canEdit && onDelete && (
            <button
              type="button"
              onClick={handleDelete}
              title="Delete this orphaned record"
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
            <p className="text-xs text-muted-foreground">Supervisor: {trial.supervisor || "Not set"}</p>

            {status === "Complete" && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <Score label="Technical" value={trial.scoreTechnical} />
                <Score label="Patient" value={trial.scorePatient} />
                <Score label="Safety" value={trial.scoreSafety} />
                <Score label="Culture" value={trial.scoreCulture} />
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
                {trial.reminder12hSent && <Badge variant="outline">12h reminder sent</Badge>}
                {trial.escalation24hSent && <Badge variant="outline">24h escalation sent</Badge>}
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              {status !== "Complete" && (
                <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
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
                  <DropdownMenuItem onClick={() => copyLink("work-trial")}>
                    {copied === "work-trial" ? <Check className="h-3.5 w-3.5 mr-2 text-penda-teal" /> : <Copy className="h-3.5 w-3.5 mr-2" />}
                    Candidate form link
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => copyLink("bm-feedback")}>
                    {copied === "bm-feedback" ? <Check className="h-3.5 w-3.5 mr-2 text-penda-teal" /> : <Copy className="h-3.5 w-3.5 mr-2" />}
                    BM feedback link
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </>
        )}
      </CardContent>

      <ScoreEntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={(scores) => onSubmitScores(trial.id, scores)}
      />
    </Card>
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
