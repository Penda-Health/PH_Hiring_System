// Reads/writes the Supabase `profiles` table (see SETUP.md section 4.6 for
// the SQL that creates it). This is the one place real *data* lives in
// Postgres in this app — everything else (candidates, offers, etc.) is
// Airtable. RLS on `profiles` enforces who can read/write what; these
// helpers just shape the client calls and don't re-implement that logic.
import type { SupabaseClient } from "@supabase/supabase-js";
import { DashboardDefaultView, EmailNotificationPreference, User, UserRoleName } from "@/types";

interface ProfileRow {
  id: string;
  email: string;
  display_name: string | null;
  job_title: string | null;
  phone: string | null;
  role: UserRoleName;
  branch_id: string | null;
  dashboard_default: DashboardDefaultView | null;
  email_notifications: EmailNotificationPreference | null;
}

function rowToUser(row: ProfileRow): User {
  return {
    id: row.id,
    name: row.display_name ?? row.email,
    email: row.email,
    role: row.role,
    jobTitle: row.job_title ?? undefined,
    phone: row.phone ?? undefined,
    branchId: row.branch_id ?? undefined,
    dashboardDefault: row.dashboard_default ?? undefined,
    emailNotifications: row.email_notifications ?? undefined,
  };
}

export async function fetchOwnProfile(supabase: SupabaseClient, userId: string): Promise<User | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (error || !data) {
    console.error("[profiles] fetchOwnProfile failed:", error);
    return null;
  }
  return rowToUser(data as ProfileRow);
}

export interface ProfileEditableFields {
  displayName?: string;
  jobTitle?: string;
  phone?: string;
  dashboardDefault?: DashboardDefaultView;
  emailNotifications?: EmailNotificationPreference;
}

export async function updateOwnProfile(
  supabase: SupabaseClient,
  userId: string,
  fields: ProfileEditableFields
): Promise<{ ok: boolean; error?: string }> {
  const patch: Record<string, unknown> = {};
  if (fields.displayName !== undefined) patch.display_name = fields.displayName;
  if (fields.jobTitle !== undefined) patch.job_title = fields.jobTitle;
  if (fields.phone !== undefined) patch.phone = fields.phone;
  if (fields.dashboardDefault !== undefined) patch.dashboard_default = fields.dashboardDefault;
  if (fields.emailNotifications !== undefined) patch.email_notifications = fields.emailNotifications;

  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Manager-only: RLS + the `profiles_guard_role_branch_change` trigger reject this for non-managers. */
export async function listAllProfiles(supabase: SupabaseClient): Promise<User[]> {
  const { data, error } = await supabase.from("profiles").select("*").order("display_name");
  if (error) {
    console.error("[profiles] listAllProfiles failed:", error);
    return [];
  }
  return (data as ProfileRow[]).map(rowToUser);
}

/** Manager-only: change another user's role and/or branch assignment. */
export async function updateUserRoleAndBranch(
  supabase: SupabaseClient,
  targetUserId: string,
  fields: { role?: UserRoleName; branchId?: string | null }
): Promise<{ ok: boolean; error?: string }> {
  const patch: Record<string, unknown> = {};
  if (fields.role !== undefined) patch.role = fields.role;
  if (fields.branchId !== undefined) patch.branch_id = fields.branchId;

  const { error } = await supabase.from("profiles").update(patch).eq("id", targetUserId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
