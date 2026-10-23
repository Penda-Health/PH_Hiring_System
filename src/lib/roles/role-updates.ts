// Server-only loaders for role updates and the role summary built from them.
import { listRecords } from "@/lib/airtable/client";
import { TABLE_NAMES } from "@/lib/airtable/field-names";
import { candidateFromAirtable, openRoleFromAirtable, roleUpdateFromAirtable } from "@/lib/airtable/mappers";
import { buildRoleSummaryRows, type RoleSummaryRow } from "@/lib/roles/role-summary";
import type { RoleUpdate } from "@/types";

/** Every role update, newest first. */
export async function loadRoleUpdates(): Promise<RoleUpdate[]> {
  const records = await listRecords(TABLE_NAMES.RoleUpdates);
  return records
    .map(roleUpdateFromAirtable)
    .filter((u) => u.roleId && u.comment)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function loadRoleSummaryRows(now: Date = new Date()): Promise<RoleSummaryRow[]> {
  const [roles, candidates, updates] = await Promise.all([
    listRecords(TABLE_NAMES.OpenRoles),
    listRecords(TABLE_NAMES.Candidates),
    loadRoleUpdates(),
  ]);
  return buildRoleSummaryRows(roles.map(openRoleFromAirtable), candidates.map(candidateFromAirtable), updates, now);
}
