import { AiOverallStatus, Candidate, ReferenceCheck } from "@/types";

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

// Badge styling for the AI insights layer's overall recommendation — shared
// by reference checks (ReferenceCheckAiInsights) and work trials
// (WorkTrialAiInsights) in src/types.ts, both keyed by the same
// AiOverallStatus scale. Kept separate from STATUS_STYLES since it's a
// judgment call the AI is making, not a workflow-progress state.
export const AI_STATUS_STYLES: Record<AiOverallStatus, string> = {
  "Strong Recommend": "bg-success-bg text-success-fg border-transparent",
  Recommend: "bg-penda-blue-light text-penda-blue-dark border-transparent",
  "Recommend with Reservations": "bg-high-bg text-high-fg border-transparent",
  "Do Not Recommend": "bg-critical-bg text-critical-fg border-transparent",
  "Insufficient Data": "bg-muted text-muted-foreground border-transparent",
};
