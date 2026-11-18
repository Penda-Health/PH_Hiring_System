import { Branch, Candidate, Interview, Locum, Offer, OpenRole, Reliever, Segment, WorkTrial } from "@/types";
import { isRoleClosed } from "@/lib/role-status";

export type DashboardPeriod = "all" | "7d" | "30d" | "mtd" | "qtd" | "3m";

export interface DashboardFilterState {
  segment: "All" | Segment;
  branchId: "All" | string;
  department: "All" | string;
  role: "All" | string;
  period: DashboardPeriod;
}

export const DEFAULT_DASHBOARD_FILTERS: DashboardFilterState = {
  segment: "All",
  branchId: "All",
  department: "All",
  role: "All",
  period: "3m",
};

export const PERIOD_LABELS: Record<DashboardPeriod, string> = {
  all: "All Time",
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
  mtd: "Month to Date",
  qtd: "Quarter to Date",
  "3m": "Last 3 Months",
};

/**
 * "Last 3 Months" keeps anything still in flight regardless of age: a role
 * that hasn't been closed (and its candidates, interviews, offers and work
 * trials) always shows, so a slow-to-fill role never drops off the dashboard.
 */
const KEEPS_OPEN_ROLES: DashboardPeriod[] = ["3m"];

function periodStart(period: DashboardPeriod): Date | null {
  const now = new Date();
  switch (period) {
    case "7d": {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d;
    }
    case "30d": {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      return d;
    }
    case "mtd":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case "qtd":
      return new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    case "3m": {
      const d = new Date(now);
      d.setMonth(d.getMonth() - 3);
      return d;
    }
    default:
      return null;
  }
}

function withinPeriod(dateStr: string | null | undefined, period: DashboardPeriod): boolean {
  if (period === "all") return true;
  if (!dateStr) return false;
  const start = periodStart(period);
  if (!start) return true;
  const t = new Date(dateStr.length === 10 ? `${dateStr}T00:00:00` : dateStr).getTime();
  return Number.isNaN(t) ? false : t >= start.getTime();
}

export type DashboardSourceData = {
  openRoles: OpenRole[];
  candidates: Candidate[];
  interviews: Interview[];
  offers: Offer[];
  workTrials: WorkTrial[];
  relievers: Reliever[];
  locums: Locum[];
};

/**
 * Applies branch/department/role/period filters across the entity set used
 * by the dashboard. Relievers and locums describe ongoing coverage zones
 * rather than time-stamped hiring events, so they pass through unfiltered —
 * the role/department/branch/period filters target the hiring pipeline.
 */
export function filterDashboardData(
  data: DashboardSourceData,
  filters: DashboardFilterState
): DashboardSourceData {
  const { openRoles, candidates, interviews, offers, workTrials, relievers, locums } = data;
  const roleFilterActive =
    filters.segment !== "All" ||
    filters.branchId !== "All" ||
    filters.department !== "All" ||
    filters.role !== "All";

  const matchedRoleIds = new Set(
    openRoles
      .filter((r) => {
        if (filters.segment !== "All" && r.segment !== filters.segment) return false;
        if (filters.branchId !== "All" && r.branchId !== filters.branchId) return false;
        if (filters.department !== "All" && r.department !== filters.department) return false;
        if (filters.role !== "All" && r.title !== filters.role) return false;
        return true;
      })
      .map((r) => r.id)
  );

  const keepOpen = KEEPS_OPEN_ROLES.includes(filters.period);
  // Roles not yet closed — everything tied to them bypasses the period cut.
  const openRoleIds = new Set(keepOpen ? openRoles.filter((r) => !isRoleClosed(r.status)).map((r) => r.id) : []);

  const openRolesFiltered = openRoles.filter((r) => {
    if (roleFilterActive && !matchedRoleIds.has(r.id)) return false;
    if (!keepOpen) return true;
    // Closed roles stay only if they were posted or closed within the window.
    return openRoleIds.has(r.id) || withinPeriod(r.dateClosed, filters.period) || withinPeriod(r.datePosted, filters.period);
  });

  const roleMatchedCandidateIds = new Set(
    candidates.filter((c) => !roleFilterActive || matchedRoleIds.has(c.roleId ?? "")).map((c) => c.id)
  );
  const candidateOnOpenRole = new Set(
    // Only candidates still in play — an old hire or rejection on a long-open
    // role is history, and stays subject to the period like everything else.
    candidates
      .filter((c) => c.roleId && openRoleIds.has(c.roleId) && !["Hired", "Rejected", "Withdrawn"].includes(c.stage))
      .map((c) => c.id)
  );
  const inWindow = (dateStr: string | null | undefined, candidateId: string) =>
    candidateOnOpenRole.has(candidateId) || withinPeriod(dateStr, filters.period);

  const candidatesFiltered = candidates.filter(
    (c) => roleMatchedCandidateIds.has(c.id) && inWindow(c.createdAt, c.id)
  );

  const interviewsFiltered = interviews.filter(
    (i) => (!roleFilterActive || matchedRoleIds.has(i.roleId)) && inWindow(i.date, i.candidateId)
  );

  const offersFiltered = offers.filter(
    (o) => roleMatchedCandidateIds.has(o.candidateId) && inWindow(o.dateSent, o.candidateId)
  );

  const workTrialsFiltered = workTrials.filter(
    (wt) => roleMatchedCandidateIds.has(wt.candidateId) && inWindow(wt.date, wt.candidateId)
  );

  return {
    openRoles: openRolesFiltered,
    candidates: candidatesFiltered,
    interviews: interviewsFiltered,
    offers: offersFiltered,
    workTrials: workTrialsFiltered,
    relievers,
    locums,
  };
}

// Cascades segment -> branch -> department -> role: each dropdown's options
// are scoped to roles matching the filters above it, so e.g. selecting "SO"
// never leaves an IPS-only function (Nursing, Pharmacy, ...) in the
// Department list, and selecting a department never leaves a role from a
// different department in the Role list.
export function getDashboardFilterOptions(
  openRoles: OpenRole[],
  branches: Branch[],
  filters: Pick<DashboardFilterState, "segment" | "branchId" | "department"> = {
    segment: "All",
    branchId: "All",
    department: "All",
  }
) {
  const rolesInSegment = openRoles.filter((r) => filters.segment === "All" || r.segment === filters.segment);
  const rolesInSegmentAndBranch = rolesInSegment.filter(
    (r) => filters.branchId === "All" || r.branchId === filters.branchId
  );
  const departments = Array.from(new Set(rolesInSegmentAndBranch.map((r) => r.department))).sort();

  const rolesScopedToDept = rolesInSegmentAndBranch.filter(
    (r) => filters.department === "All" || r.department === filters.department
  );
  const roles = Array.from(new Set(rolesScopedToDept.map((r) => r.title))).sort();

  const branchOptions = branches
    .filter((b) => b.active)
    .map((b) => ({ id: b.id, name: b.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return { departments, roles, branchOptions };
}
