import { Candidate, CandidateStage, OpenRole } from "@/types";

export function headcountPct(role: OpenRole): number {
  if (role.hcApproved === 0) return 0;
  return Math.min(100, Math.round((role.hcFilled / role.hcApproved) * 100));
}

// The "still in the pipeline" definition, shared with activeCandidateCountForRole
// in pipeline-helpers.ts — kept as one canonical set so the two pages can't
// silently drift into counting different things as "active" again.
export const ACTIVE_CANDIDATE_STAGE_EXCLUSIONS: ReadonlySet<CandidateStage> = new Set<CandidateStage>([
  "Hired",
  "Rejected",
  "Withdrawn",
  "Backup Pool",
]);

export function activeCandidateCount(role: OpenRole, candidates: Candidate[]): number {
  return candidates.filter(
    (c) => c.roleId === role.id && !ACTIVE_CANDIDATE_STAGE_EXCLUSIONS.has(c.stage)
  ).length;
}

export function candidatesForRole(roleId: string, candidates: Candidate[]) {
  return candidates.filter((c) => c.roleId === roleId);
}
