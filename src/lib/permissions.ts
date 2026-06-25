// Central role/permission helpers — pure functions, safe to import from both
// client components and middleware (no "use client", no Supabase calls).
import { UserRoleName } from "@/types";

/** Roles that should never see real salary/offer figures in the UI. */
const SALARY_MASKED_ROLES: UserRoleName[] = ["contributor", "branch_manager"];

export function canSeeSalary(role: UserRoleName | undefined): boolean {
  if (!role) return false;
  return !SALARY_MASKED_ROLES.includes(role);
}

/** Formats a salary/rate figure, or returns the masked placeholder for roles that shouldn't see it. */
export function maskSalary(value: number | null | undefined, role: UserRoleName | undefined, prefix = "KES "): string {
  if (!canSeeSalary(role)) return "Confidential";
  if (value === null || value === undefined) return "—";
  return `${prefix}${value.toLocaleString()}`;
}

/** Routes (prefix-matched) restricted to specific roles. Checked in middleware against the signed-in user's profile. */
export const ROLE_ROUTES: Record<string, UserRoleName[]> = {
  "/settings": ["recruitment_manager"],
};

export function isRouteAllowed(pathname: string, role: UserRoleName | undefined): boolean {
  for (const [prefix, allowed] of Object.entries(ROLE_ROUTES)) {
    if (pathname.startsWith(prefix)) return !!role && allowed.includes(role);
  }
  return true;
}

// Roles are a flat enum in the DB, but edit access needs a "this tier and
// above" check, so we rank them here rather than listing every allowed role
// at every call site. "recruitment_manager" is the de facto super-admin tier
// (see SETUP.md) — there's no separate super_admin role today.
const ROLE_HIERARCHY: UserRoleName[] = ["contributor", "branch_manager", "recruitment_user", "recruitment_manager"];

function roleRank(role: UserRoleName | undefined): number {
  if (!role) return -1;
  return ROLE_HIERARCHY.indexOf(role);
}

/** Recruitment Manager and Recruitment User can create/edit recruitment data; Branch Manager and Contributor are view-only. */
export function canEditRecruitmentData(role: UserRoleName | undefined): boolean {
  return roleRank(role) >= ROLE_HIERARCHY.indexOf("recruitment_user");
}

// Airtable-backed resources whose mutating requests (anything but GET) are
// restricted to canEditRecruitmentData() roles. Read access (GET) stays open
// to every signed-in, domain-allowed user. Public form/automation routes
// (/api/public/*, /api/forms/issue-link) authenticate separately and are
// never reached here — see src/middleware.ts.
export const RECRUITMENT_DATA_API_PREFIXES = [
  "/api/branches",
  "/api/requisitions",
  "/api/open-roles",
  "/api/candidates",
  "/api/interviews",
  "/api/work-trials",
  "/api/reference-checks",
  "/api/offers",
  "/api/new-employees",
  "/api/relievers",
  "/api/locums",
];

// Requisition *intake* (POST /api/requisitions) is the front door for branch
// managers/contributors to raise a hiring gap — it must stay open to every
// staff role. Everything else (approving/rejecting that requisition, and all
// other create/edit calls) is restricted to canEditRecruitmentData() roles.
const UNGATED_MUTATIONS: { method: string; path: string }[] = [{ method: "POST", path: "/api/requisitions" }];

export function isGatedMutation(method: string, pathname: string): boolean {
  if (method === "GET") return false;
  if (UNGATED_MUTATIONS.some((m) => m.method === method && pathname === m.path)) return false;
  return RECRUITMENT_DATA_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
