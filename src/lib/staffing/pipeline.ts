// Cross-references a Branch × Cadre gap cell against the live hiring
// pipeline — who's already in progress against this gap, and whether
// anyone's start date lands inside the projection month. Read-only: this
// never writes anything back to Candidates/Offers/OpenRoles.
import { Candidate, Cadre, Offer, OpenRole } from "@/types";
import { ACTIVE_CANDIDATE_STAGE_EXCLUSIONS } from "@/lib/roles-helpers";
import { resolveCadre } from "./compute";
import { monthPrefix } from "./constants";

export interface PipelineCandidate {
  candidate: Candidate;
  role: OpenRole;
  /** True when a linked Offer's startDate falls inside the target month. */
  startsThisMonth: boolean;
}

function roleBranchIds(role: OpenRole): string[] {
  if (role.branchIds?.length) return role.branchIds;
  return role.branchId ? [role.branchId] : [];
}

export function rolesForCell(branchId: string, cadre: Cadre, openRoles: OpenRole[]): OpenRole[] {
  return openRoles.filter(
    (r) => r.status !== "Cancelled" && resolveCadre(r) === cadre && roleBranchIds(r).includes(branchId)
  );
}

export function pipelineForCell(
  branchId: string,
  cadre: Cadre,
  monthKey: string,
  candidates: Candidate[],
  openRoles: OpenRole[],
  offers: Offer[]
): PipelineCandidate[] {
  const roleIds = new Set(rolesForCell(branchId, cadre, openRoles).map((r) => r.id));
  if (roleIds.size === 0) return [];
  const targetPrefix = monthPrefix(monthKey);
  const offerByCandidateId = new Map(offers.map((o) => [o.candidateId, o]));

  return candidates
    .filter((c) => c.roleId && roleIds.has(c.roleId) && !ACTIVE_CANDIDATE_STAGE_EXCLUSIONS.has(c.stage))
    .map((candidate) => {
      const role = openRoles.find((r) => r.id === candidate.roleId)!;
      const offer = offerByCandidateId.get(candidate.id);
      const startsThisMonth = !!offer?.startDate && monthPrefix(offer.startDate) === targetPrefix;
      return { candidate, role, startsThisMonth };
    });
}
