"use client";

import { useRecruitmentData } from "@/lib/data-store/recruitment-context";
import { WorkTrialCard } from "@/components/work-trials/work-trial-card";
import { NewWorkTrialDialog } from "@/components/work-trials/new-work-trial-dialog";

export default function WorkTrialsPage() {
  const { workTrials, candidates, branches, createWorkTrial, submitWorkTrialScores, canEdit } = useRecruitmentData();

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
            <WorkTrialCard key={trial.id} trial={trial} onSubmitScores={submitWorkTrialScores} />
          ))}
        </div>
      )}
    </div>
  );
}
