import { Candidate, OpenRole, Segment } from "@/types";

// activeCandidateCountForRole() used to live here as its own separate
// whitelist of stages — it happened to be exactly the complement of
// ACTIVE_CANDIDATE_STAGE_EXCLUSIONS (the Roles page's definition of
// "active"), a duplication that could have silently drifted. Callers now
// use roles-helpers.ts's ACTIVE_CANDIDATE_STAGE_EXCLUSIONS directly (see
// pipeline-role-explorer.tsx), so this wrapper was removed rather than kept
// as a redundant pass-through.

export function getRoleForCandidate(candidate: Candidate, openRoles: OpenRole[]): OpenRole | undefined {
  return openRoles.find((r) => r.id === candidate.roleId);
}

// Locums fill in wherever needed rather than against one specific open role,
// so they're commonly saved with a segment/department but no roleId. Rather
// than show a bare "Unknown role" for them, stand in with the short job-title
// stub the business already uses for that department (matching the naming
// real Locum open roles use, e.g. "Labtech - Locum") — falling back to the
// department name itself for departments without an established stub.
const IPS_LOCUM_ROLE_STUBS: Partial<Record<string, string>> = {
  Pharmacy: "Pharmtech",
  Laboratory: "Labtech",
  "Clinical Services": "Clinical Officer",
  Nursing: "Nurse",
  Sonography: "Sonographer",
};

export interface CandidateRoleDisplay {
  title: string;
  segment?: Segment;
  /** True when this wasn't a real linked OpenRole — synthesized for an unassigned Locum. */
  isFiller?: boolean;
}

export function getCandidateRoleDisplay(candidate: Candidate, openRoles: OpenRole[]): CandidateRoleDisplay {
  const role = getRoleForCandidate(candidate, openRoles);
  if (role) return { title: role.title, segment: role.segment };

  if (candidate.employmentType === "Locum" && candidate.department) {
    const stub =
      candidate.segment === "IPS"
        ? IPS_LOCUM_ROLE_STUBS[candidate.department] ?? candidate.department
        : candidate.department;
    return { title: `${stub} - Locum`, segment: candidate.segment, isFiller: true };
  }

  return { title: "Unknown role" };
}

export function daysInStage(stageEnteredAt: string): number {
  const entered = new Date(stageEnteredAt).getTime();
  const now = Date.now();
  return Math.max(0, Math.floor((now - entered) / (1000 * 60 * 60 * 24)));
}

export function getUniqueRecruiters(openRoles: OpenRole[]): string[] {
  return Array.from(new Set(openRoles.map((r) => r.recruiter))).sort();
}

export function daysOpen(datePosted: string): number | null {
  if (!datePosted) return null;
  const posted = new Date(datePosted).getTime();
  if (isNaN(posted)) return null;
  return Math.max(0, Math.floor((Date.now() - posted) / (1000 * 60 * 60 * 24)));
}

export function headcountRemaining(role: OpenRole): number {
  return Math.max(0, role.hcApproved - role.hcFilled);
}

export interface HeadcountSummary {
  roleCount: number;
  approved: number;
  filled: number;
  remaining: number;
}

export function summarizeHeadcount(roles: OpenRole[]): HeadcountSummary {
  return roles.reduce<HeadcountSummary>(
    (acc, role) => ({
      roleCount: acc.roleCount + 1,
      approved: acc.approved + role.hcApproved,
      filled: acc.filled + role.hcFilled,
      remaining: acc.remaining + headcountRemaining(role),
    }),
    { roleCount: 0, approved: 0, filled: 0, remaining: 0 }
  );
}

export type RoleGroup = "Open" | "Allocated" | "On Hold" | "Closed";

const GROUP_ORDER: RoleGroup[] = ["Open", "Allocated", "On Hold", "Closed"];

export function roleGroup(role: OpenRole): RoleGroup {
  if (role.status === "Open") return "Open";
  if (role.status === "Allocated" || role.status === "Filled") return "Allocated";
  if (role.status === "On Hold") return "On Hold";
  return "Closed"; // Cancelled
}

export function compareRoleGroups(a: OpenRole, b: OpenRole): number {
  return GROUP_ORDER.indexOf(roleGroup(a)) - GROUP_ORDER.indexOf(roleGroup(b));
}

export type MonthRangeOption = "1" | "3" | "6" | "9" | "all";

export const MONTH_RANGE_OPTIONS: { value: MonthRangeOption; label: string }[] = [
  { value: "1", label: "Last 30 days" },
  { value: "3", label: "Last 3 months" },
  { value: "6", label: "Last 6 months" },
  { value: "9", label: "Last 9 months" },
  { value: "all", label: "All time" },
];

// Open and On Hold roles always pass through (they're still live).
// Closed/Allocated/Filled roles use a rolling window: "1" = last 30 days,
// "3"/"6"/"9" = rolling N×30 days back — so a role closed yesterday is
// never dropped just because the calendar month rolled over.
export function isRoleInMonthRange(role: OpenRole, months: MonthRangeOption, now: Date = new Date()): boolean {
  if (months === "all" || role.status === "Open" || role.status === "On Hold") return true;
  // Roles without a dateClosed were never properly closed via the app — show
  // them rather than hiding them based on the unrelated datePosted field.
  if (!role.dateClosed) return true;
  const days = Number(months) * 30;
  const windowStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  const closedAt = new Date(role.dateClosed);
  return closedAt >= windowStart;
}
