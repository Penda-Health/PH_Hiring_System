"use client";

import * as React from "react";
import { WorkTrial } from "@/types";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";
import { WorkTrialCard } from "@/components/work-trials/work-trial-card";
import { NewWorkTrialDialog } from "@/components/work-trials/new-work-trial-dialog";

export default function WorkTrialsPage() {
  const {
    workTrials, candidates, branches, openRoles,
    createWorkTrial, updateWorkTrial, deleteWorkTrial, submitWorkTrialScores, canEdit,
  } = useRecruitmentData();

  // Candidates at Work Trial stage with no matching WorkTrial record.
  const unsynced = React.useMemo(() => {
    const linked = new Set(workTrials.map((t) => t.candidateId));
    return candidates.filter((c) => c.stage === "Work Trial" && !linked.has(c.id));
  }, [candidates, workTrials]);

  // Auto-create records for any unsynced candidates as soon as data is ready.
  const syncedRef = React.useRef(false);
  React.useEffect(() => {
    if (syncedRef.current || unsynced.length === 0 || !canEdit) return;
    syncedRef.current = true;
    const now = new Date().toISOString();
    Promise.all(
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
    ).catch((err) => console.error("Failed to auto-sync work trials:", err));
  }, [unsynced, openRoles, branches, createWorkTrial, canEdit]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Work Trials</h1>
        {canEdit && (
          <NewWorkTrialDialog
            candidates={candidates}
            branches={branches}
            onCreate={createWorkTrial}
          />
        )}
      </div>

      {workTrials.length === 0 ? (
        <p className="text-sm text-muted-foreground">No work trials yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {workTrials.map((trial) => (
            <WorkTrialCard
              key={trial.id}
              trial={trial}
              onSubmitScores={submitWorkTrialScores}
              onUpdate={updateWorkTrial}
              onDelete={deleteWorkTrial}
            />
          ))}
        </div>
      )}
    </div>
  );
}
