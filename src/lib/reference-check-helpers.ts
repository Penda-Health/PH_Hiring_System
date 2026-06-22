import { Candidate, ReferenceCheck } from "@/types";

export function getCandidateForRefCheck(refCheck: ReferenceCheck, candidates: Candidate[]) {
  return candidates.find((c) => c.id === refCheck.candidateId);
}

export const OUTCOME_STYLES: Record<string, string> = {
  Pending: "bg-high-bg text-high-fg border-transparent",
  Positive: "bg-penda-teal-light text-penda-teal-dark border-transparent",
  Negative: "bg-critical-bg text-critical-fg border-transparent",
  Mixed: "bg-muted text-muted-foreground border-transparent",
};
