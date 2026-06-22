"use client";

import { Candidate, CandidateStage, OpenRole } from "@/types";
import { PIPELINE_STAGES } from "@/lib/dashboard-metrics";
import { PipelineColumn } from "./pipeline-column";

export function RoleBreakdown({
  role,
  candidates,
  onSelectCandidate,
}: {
  role: OpenRole;
  candidates: Candidate[];
  onSelectCandidate: (candidate: Candidate) => void;
}) {
  const roleCandidates = candidates.filter((c) => c.roleId === role.id);
  const byStage = (stage: CandidateStage) => roleCandidates.filter((c) => c.stage === stage);

  return (
    <div className="space-y-3 rounded-lg border border-penda-teal/30 bg-muted/30 p-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">{role.title}</h2>
        <span className="text-sm text-muted-foreground">{role.location}</span>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {PIPELINE_STAGES.map((stage) => (
          <PipelineColumn
            key={stage}
            stage={stage}
            candidates={byStage(stage)}
            onSelectCandidate={onSelectCandidate}
          />
        ))}
      </div>
    </div>
  );
}
