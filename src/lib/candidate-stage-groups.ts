import { CandidateStage } from "@/types";

export interface CandidateStageGroup {
  id: string;
  label: string;
  stages: CandidateStage[];
}

// Drives both the Candidates list page's status tabs and its Kanban columns,
// so the two views never drift apart on what "Interviewing" etc. means.
export const CANDIDATE_STAGE_GROUPS: CandidateStageGroup[] = [
  { id: "interviewing", label: "Interviewing", stages: ["First Interview", "Second Interview", "Panel Interview"] },
  { id: "work-trial", label: "Work Trial", stages: ["Work Trial"] },
  { id: "reference-check", label: "Reference Check", stages: ["Reference Check"] },
  { id: "offer", label: "Offer", stages: ["Offer"] },
  { id: "hired", label: "Hired", stages: ["Hired"] },
  { id: "backup-pool", label: "Backup Pool", stages: ["Backup Pool"] },
  { id: "rejected", label: "Rejected", stages: ["Rejected", "Withdrawn"] },
];

const STAGE_TO_GROUP_ID = new Map<CandidateStage, string>(
  CANDIDATE_STAGE_GROUPS.flatMap((group) => group.stages.map((stage) => [stage, group.id] as const))
);

export function getCandidateStageGroupId(stage: CandidateStage): string {
  return STAGE_TO_GROUP_ID.get(stage) ?? "other";
}
