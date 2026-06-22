"use client";

import { useRecruitmentData } from "@/lib/data-store/recruitment-context";
import { WorkTrialCard } from "@/components/work-trials/work-trial-card";

export default function WorkTrialsPage() {
  const { workTrials, submitWorkTrialScores } = useRecruitmentData();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Work Trials</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {workTrials.map((trial) => (
          <WorkTrialCard key={trial.id} trial={trial} onSubmitScores={submitWorkTrialScores} />
        ))}
      </div>
    </div>
  );
}
