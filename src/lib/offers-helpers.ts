import { Candidate, Offer, OfferOutcome, OpenRole } from "@/types";

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
  const ms = new Date(deadline).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export const JOIN_STATUS_STYLES: Record<string, string> = {
  Pending: "bg-muted text-muted-foreground border-transparent",
  Joined: "bg-penda-teal-light text-penda-teal-dark border-transparent",
  "Did Not Join": "bg-critical-bg text-critical-fg border-transparent",
};
