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

// Weights: Culture 40%, Patient Experience 40%, Technical 20%
// Patient Experience carries more weight as the most trainable quality.
// Culture and Technical both have a 6/10 auto-fail gate (see below).
export function computeWeightedTotal(scores: {
  technical: number;
  patient: number;
  culture: number;
  safety?: number;
}): number {
  const total = scores.culture * 0.4 + scores.patient * 0.4 + scores.technical * 0.2;
  return Math.round(total * 10) / 10;
}

export const PASS_THRESHOLD = 65;

// Scores at or below this value (out of 100) trigger an automatic fail,
// regardless of the weighted total. 61 = anything 6/10 or below auto-fails.
export const CULTURE_AUTO_FAIL_BELOW = 61;
export const TECHNICAL_AUTO_FAIL_BELOW = 61;

export function isCultureAutoFail(cultureScore: number): boolean {
  return cultureScore < CULTURE_AUTO_FAIL_BELOW;
}

export function isTechnicalAutoFail(technicalScore: number): boolean {
  return technicalScore < TECHNICAL_AUTO_FAIL_BELOW;
}

export function computePassFail(
  scores: { technical: number; patient: number; culture: number }
): "Pass" | "Fail" {
  if (isCultureAutoFail(scores.culture)) return "Fail";
  if (isTechnicalAutoFail(scores.technical)) return "Fail";
  const total = computeWeightedTotal(scores);
  return total >= PASS_THRESHOLD ? "Pass" : "Fail";
}
