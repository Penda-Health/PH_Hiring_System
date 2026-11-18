import type { RoleStatus } from "@/types";

/** Statuses that end a role's hiring: it was filled, or it won't be. */
export const CLOSED_ROLE_STATUSES: RoleStatus[] = ["Filled", "Cancelled"];

export function isRoleClosed(status: RoleStatus): boolean {
  return CLOSED_ROLE_STATUSES.includes(status);
}
