import { Candidate, OpenRole } from "@/types";

export function getRoleForCandidate(candidate: Candidate, openRoles: OpenRole[]): OpenRole | undefined {
  return openRoles.find((r) => r.id === candidate.roleId);
}

const ACTIVE_STAGES = new Set<Candidate["stage"]>([
  "First Interview",
  "Second Interview",
  "Panel Interview",
  "Work Trial",
  "Reference Check",
  "Offer",
]);

export function activeCandidateCountForRole(roleId: string, candidates: Candidate[]): number {
  return candidates.filter((c) => c.roleId === roleId && ACTIVE_STAGES.has(c.stage)).length;
}

export function daysInStage(stageEnteredAt: string): number {
  const entered = new Date(stageEnteredAt).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - entered) / (1000 * 60 * 60 * 24)));
}

export function getUniqueRecruiters(openRoles: OpenRole[]): string[] {
  return Array.from(new Set(openRoles.map((r) => r.recruiter))).sort();
}

export function daysOpen(datePosted: string): number {
  const posted = new Date(datePosted).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - posted) / (1000 * 60 * 60 * 24)));
}

export function headcountRemaining(role: OpenRole): number {
  return Math.max(0, role.hcApproved - role.hcFilled);
}

export type RoleGroup = "Open" | "Allocated" | "Closed";

const GROUP_ORDER: RoleGroup[] = ["Open", "Allocated", "Closed"];

export function roleGroup(role: OpenRole): RoleGroup {
  if (role.status === "Open") return "Open";
  if (role.status === "Filled") return "Allocated";
  return "Closed";
}

export function compareRoleGroups(a: OpenRole, b: OpenRole): number {
  return GROUP_ORDER.indexOf(roleGroup(a)) - GROUP_ORDER.indexOf(roleGroup(b));
}

export type MonthRangeOption = "1" | "3" | "6" | "9" | "all";

export const MONTH_RANGE_OPTIONS: { value: MonthRangeOption; label: string }[] = [
  { value: "1", label: "This month" },
  { value: "3", label: "Last 3 months" },
  { value: "6", label: "Last 6 months" },
  { value: "9", label: "Last 9 months" },
  { value: "all", label: "All time" },
];

// Open roles always pass through (they're still live, regardless of when
// they were posted); closed/allocated roles only show in the month window
// they closed in, so a role closed in June drops out of July's view.
export function isRoleInMonthRange(role: OpenRole, months: MonthRangeOption, now: Date = new Date()): boolean {
  if (months === "all" || role.status === "Open") return true;
  const windowStart = new Date(now.getFullYear(), now.getMonth() - (Number(months) - 1), 1);
  const closedAt = new Date(role.dateClosed ?? role.datePosted);
  return closedAt >= windowStart;
}
