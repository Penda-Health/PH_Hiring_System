import { Branch, Candidate, WorkTrial } from "@/types";

export type WorkTrialDisplayStatus = "Awaiting Arrival" | "Awaiting Score" | "Complete";

export function getDisplayStatus(trial: WorkTrial): WorkTrialDisplayStatus {
  if (trial.arrivalMarked === null) return "Awaiting Arrival";
  if (trial.total === null) return "Awaiting Score";
  return "Complete";
}

export function getCandidateForTrial(trial: WorkTrial, candidates: Candidate[]) {
  return candidates.find((c) => c.id === trial.candidateId);
}

export function getBranchForTrial(trial: WorkTrial, branches: Branch[]) {
  return branches.find((b) => b.id === trial.branchId);
}

// Weights: Culture 40%, Patient Experience 30%, Technical 30%
export function computeWeightedTotal(scores: {
  technical: number;
  patient: number;
  culture: number;
  safety?: number;
}): number {
  const total = scores.culture * 0.4 + scores.patient * 0.3 + scores.technical * 0.3;
  return Math.round(total * 10) / 10;
}

export const PASS_THRESHOLD = 65;

// Culture score below this value (out of 100) is an automatic fail,
// regardless of the weighted total.
export const CULTURE_AUTO_FAIL_BELOW = 20;

export function isCultureAutoFail(cultureScore: number): boolean {
  return cultureScore < CULTURE_AUTO_FAIL_BELOW;
}

export function computePassFail(
  scores: { technical: number; patient: number; culture: number }
): "Pass" | "Fail" {
  if (isCultureAutoFail(scores.culture)) return "Fail";
  const total = computeWeightedTotal(scores);
  return total >= PASS_THRESHOLD ? "Pass" : "Fail";
}
