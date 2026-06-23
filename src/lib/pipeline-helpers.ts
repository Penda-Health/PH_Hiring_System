import { Candidate, OpenRole } from "@/types";

export function getRoleForCandidate(candidate: Candidate, openRoles: OpenRole[]): OpenRole | undefined {
  return openRoles.find((r) => r.id === candidate.roleId);
}

const ACTIVE_STAGES = new Set<Candidate["stage"]>([
  "First Interview",
  "Second Interview",
  "Panel Interview",
  "Work Trial",
  "Reference Check",
  "Offer",
]);

export function activeCandidateCountForRole(roleId: string, candidates: Candidate[]): number {
  return candidates.filter((c) => c.roleId === roleId && ACTIVE_STAGES.has(c.stage)).length;
}

export function daysInStage(stageEnteredAt: string): number {
  const entered = new Date(stageEnteredAt).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - entered) / (1000 * 60 * 60 * 24)));
}

export function getUniqueRecruiters(openRoles: OpenRole[]): string[] {
  return Array.from(new Set(openRoles.map((r) => r.recruiter))).sort();
}
