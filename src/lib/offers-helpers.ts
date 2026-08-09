import { Candidate, Offer, OfferOutcome, OpenRole } from "@/types";
import { daysUntil } from "@/lib/date-utils";

export const OFFER_OUTCOMES: OfferOutcome[] = ["Pending", "Negotiating", "Accepted", "Declined", "Withdrawn"];

export function getCandidateForOffer(offer: Offer, candidates: Candidate[]) {
  return candidates.find((c) => c.id === offer.candidateId);
}

export function getRoleForOffer(offer: Offer, candidates: Candidate[], openRoles: OpenRole[]) {
  const candidate = getCandidateForOffer(offer, candidates);
  if (!candidate) return undefined;
  return openRoles.find((r) => r.id === candidate.roleId);
}

export function daysUntilDeadline(deadline: string): number {
  // A partial day left shouldn't read as "0d to deadline" — round up.
  return Math.ceil(daysUntil(deadline));
}

export const JOIN_STATUS_STYLES: Record<string, string> = {
  Pending: "bg-muted text-muted-foreground border-transparent",
  Joined: "bg-penda-blue-light text-penda-blue-dark border-transparent",
  "Did Not Join": "bg-critical-bg text-critical-fg border-transparent",
};
