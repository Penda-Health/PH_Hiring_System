"use client";

import * as React from "react";
import { WorkTrial } from "@/types";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";
import { WorkTrialCard } from "@/components/work-trials/work-trial-card";
import { NewWorkTrialDialog } from "@/components/work-trials/new-work-trial-dialog";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

export default function WorkTrialsPage() {
  const {
    workTrials, candidates, branches, openRoles,
    createWorkTrial, deleteWorkTrial, submitWorkTrialScores, canEdit,
  } = useRecruitmentData();

  const [syncing, setSyncing] = React.useState(false);

  // Candidates at Work Trial stage with no matching WorkTrial record yet.
  const unsynced = React.useMemo(() => {
    const linkedCandidateIds = new Set(workTrials.map((t) => t.candidateId));
    return candidates.filter(
      (c) => c.stage === "Work Trial" && !linkedCandidateIds.has(c.id)
    );
  }, [candidates, workTrials]);

  async function syncFromPipeline() {
    if (unsynced.length === 0) return;
    setSyncing(true);
    try {
      const now = new Date().toISOString();
      await Promise.all(
        unsynced.map((candidate) => {
          const linkedRole = openRoles.find((r) => r.id === candidate.roleId);
          const branchId = branches.find((b) => b.name === linkedRole?.location)?.id ?? "";
          return createWorkTrial({
            id: `wt-${Date.now()}-${candidate.id}`,
            wtId: "",
            candidateId: candidate.id,
            roleId: candidate.roleId || undefined,
            branchId,
            date: now.slice(0, 10),
            supervisor: "",
            createdAt: now,
            arrivalMarked: null,
            scoreTechnical: null,
            scorePatient: null,
            scoreSafety: null,
            scoreCulture: null,
            total: null,
            passFail: "Pending",
            formSubmittedAt: null,
            reminder12hSent: false,
            escalation24hSent: false,
          } as WorkTrial);
        })
      );
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Work Trials</h1>
          {unsynced.length > 0 && (
            <p className="text-sm text-amber-500 mt-0.5">
              {unsynced.length} candidate{unsynced.length > 1 ? "s" : ""} at Work Trial stage with no trial record
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {canEdit && unsynced.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={syncFromPipeline}
              disabled={syncing}
              className="gap-1.5 text-amber-600 border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing…" : `Sync ${unsynced.length} from pipeline`}
            </Button>
          )}
          {canEdit && (
            <NewWorkTrialDialog
              candidates={candidates}
              branches={branches}
              onCreate={createWorkTrial}
            />
          )}
        </div>
      </div>

      {workTrials.length === 0 && unsynced.length === 0 ? (
        <p className="text-sm text-muted-foreground">No work trials yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {workTrials.map((trial) => (
            <WorkTrialCard
              key={trial.id}
              trial={trial}
              onSubmitScores={submitWorkTrialScores}
              onDelete={deleteWorkTrial}
            />
          ))}
        </div>
      )}
    </div>
  );
}
