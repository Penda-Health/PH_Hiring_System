import { Candidate, OpenRole } from "@/types";

export function headcountPct(role: OpenRole): number {
  if (role.hcApproved === 0) return 0;
  return Math.min(100, Math.round((role.hcFilled / role.hcApproved) * 100));
}

export function activeCandidateCount(role: OpenRole, candidates: Candidate[]): number {
  return candidates.filter(
    (c) => c.roleId === role.id && !["Hired", "Rejected", "Withdrawn", "Backup Pool"].includes(c.stage)
  ).length;
}

export function candidatesForRole(roleId: string, candidates: Candidate[]) {
  return candidates.filter((c) => c.roleId === roleId);
}

export const uniqueDepartments = (roles: OpenRole[]) =>
  Array.from(new Set(roles.map((r) => r.department))).sort();
