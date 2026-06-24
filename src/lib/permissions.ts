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
