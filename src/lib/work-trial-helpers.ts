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

export function computeWeightedTotal(scores: {
  technical: number;
  patient: number;
  safety: number;
  culture: number;
}): number {
  const total = scores.technical * 0.4 + scores.patient * 0.3 + scores.safety * 0.2 + scores.culture * 0.1;
  return Math.round(total * 10) / 10;
}

export const PASS_THRESHOLD = 70;
