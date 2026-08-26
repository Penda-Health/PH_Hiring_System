import { Candidate, ReferenceCheck } from "@/types";

export function getCandidateForRefCheck(refCheck: ReferenceCheck, candidates: Candidate[]) {
  return candidates.find((c) => c.id === refCheck.candidateId);
}

export const OUTCOME_STYLES: Record<string, string> = {
  Pending: "bg-high-bg text-high-fg border-transparent",
  Positive: "bg-penda-blue-light text-penda-blue-dark border-transparent",
  Negative: "bg-critical-bg text-critical-fg border-transparent",
  Mixed: "bg-muted text-muted-foreground border-transparent",
};

// The derived `status` field — see ReferenceCheckStatus in src/types.ts —
// drives this badge, the TA verification queue, and every reference-check
// Airtable automation's trigger condition.
export const STATUS_STYLES: Record<ReferenceCheck["status"], string> = {
  "Awaiting Verification": "bg-critical-bg text-critical-fg border-transparent",
  "Awaiting Responses": "bg-high-bg text-high-fg border-transparent",
  "1 Referee In": "bg-penda-blue-light text-penda-blue-dark border-transparent",
  "Ready for Offer": "bg-penda-blue text-white border-transparent",
};
