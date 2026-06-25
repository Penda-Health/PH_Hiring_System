"use client";

import { Candidate, CandidateStage, OpenRole, RoleStatus } from "@/types";
import { PIPELINE_STAGES } from "@/lib/dashboard-metrics";
import { PipelineColumn } from "./pipeline-column";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";

const STATUS_OPTIONS: RoleStatus[] = ["Open", "Allocated", "Filled", "On Hold", "Cancelled"];

export function RoleBreakdown({
  role,
  candidates,
  onSelectCandidate,
}: {
  role: OpenRole;
  candidates: Candidate[];
  onSelectCandidate: (candidate: Candidate) => void;
}) {
  const { updateOpenRoleStatus, canEdit } = useRecruitmentData();
  const roleCandidates = candidates.filter((c) => c.roleId === role.id);
  const byStage = (stage: CandidateStage) => roleCandidates.filter((c) => c.stage === stage);

  return (
    <div className="space-y-3 rounded-lg border border-penda-teal/30 bg-muted/30 p-4">
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">{role.title}</h2>
        <span className="text-sm text-muted-foreground">{role.location}</span>
        <Select
          value={role.status}
          onValueChange={(v) => updateOpenRoleStatus(role.id, v as RoleStatus)}
          disabled={!canEdit}
        >
          <SelectTrigger
            className="w-32 h-8 ml-auto"
            onClick={(e) => e.stopPropagation()}
            title={canEdit ? undefined : "View only — contact a Recruitment Manager to change status"}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((status) => (
              <SelectItem key={status} value={status}>
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
