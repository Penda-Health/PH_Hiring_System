import { Branch, OpenRole, Requisition } from "@/types";
import { headcountRemaining } from "@/lib/pipeline-helpers";

/** Branches currently in the expansion phase (Kinoo, G44, ...) — flagged, not name-matched, so new ones need no code change. */
export function expansionBranches(branches: Branch[]): Branch[] {
  return branches.filter((b) => b.expansionBranch);
}

/**
 * Every branch this role is linked to. Prefers branchIds (the full link
 * list — some roles are shared/split across several clustered branches at
 * once, see OpenRole.branchIds) and falls back to the single branchId for
 * data that predates that field (e.g. mock/dev fixtures).
 */
export function roleBranchIds(role: OpenRole): string[] {
  if (role.branchIds && role.branchIds.length > 0) return role.branchIds;
  return role.branchId ? [role.branchId] : [];
}

/**
 * True if ANY branch this role is linked to is an expansion branch — a
 * clustered role split across Kinoo and a non-expansion branch still counts,
 * since part of its headcount is genuinely expansion headcount.
 */
export function isExpansionRole(role: OpenRole, branches: Branch[]): boolean {
  const expansionIds = new Set(expansionBranches(branches).map((b) => b.id));
  return roleBranchIds(role).some((id) => expansionIds.has(id));
}

export type FillType = "Internal" | "External" | "Unfilled";

/** How a role's headcount got (or will get) filled — independent of whether it's fully staffed yet. */
export function fillType(role: OpenRole): FillType {
  if (role.internalFill) return "Internal";
  if (role.hcFilled > 0) return "External";
  return "Unfilled";
}

export type ReplacementStatus =
  | "Needs Replacement" // internally filled, nothing raised to backfill the vacated seat yet
  | "Pending Approval" // backfill requisition raised, still working through approvers
  | "Approved" // approved, not yet converted into an open role
  | "Rejected" // backfill requisition was rejected — needs a new one
  | "In Pipeline" // backfill converted to an open role, still being recruited
  | "Backfilled"; // backfill role's headcount is fully filled

/**
 * Derives the backfill status for an internally-filled role from its linked
 * Requisition (and, once that's converted, the resulting OpenRole's own
 * headcount) — never hand-set, so it can't drift out of sync with the real
 * requisition/role it's tracking.
 *
 * Returns null for roles that aren't internal fills — replacement tracking
 * doesn't apply to them.
 */
export function resolveReplacementStatus(
  role: OpenRole,
  requisitions: Requisition[],
  openRoles: OpenRole[]
): ReplacementStatus | null {
  if (!role.internalFill) return null;
  if (!role.replacementRequisitionId) return "Needs Replacement";

  const req = requisitions.find((r) => r.id === role.replacementRequisitionId);
  if (!req) return "Needs Replacement";

  if (req.status === "Pending Approval") return "Pending Approval";
  if (req.status === "Approved") return "Approved";
  if (req.status === "Rejected") return "Rejected";

  // "Converted to Open Role" — the real signal is that role's own headcount.
  const backfillRole = openRoles.find((r) => r.requisitionId === req.id);
  if (!backfillRole) return "In Pipeline"; // converted but the role hasn't synced in yet
  return headcountRemaining(backfillRole) <= 0 ? "Backfilled" : "In Pipeline";
}

export interface ExpansionSummary {
  roleCount: number;
  internal: number;
  external: number;
  unfilled: number;
  pendingReplacements: number; // internal fills not yet "Backfilled"
}

export function summarizeExpansion(roles: OpenRole[], requisitions: Requisition[], openRoles: OpenRole[]): ExpansionSummary {
  const summary: ExpansionSummary = { roleCount: 0, internal: 0, external: 0, unfilled: 0, pendingReplacements: 0 };
  for (const role of roles) {
    summary.roleCount += 1;
    const type = fillType(role);
    if (type === "Internal") summary.internal += 1;
    else if (type === "External") summary.external += 1;
    else summary.unfilled += 1;

    const status = resolveReplacementStatus(role, requisitions, openRoles);
    if (status && status !== "Backfilled") summary.pendingReplacements += 1;
  }
  return summary;
}
