// Reads/writes the Supabase ips_meetings / ips_allocations / ips_meeting_notes
// / ips_board_editors tables (see SETUP.md section 4.7 for the SQL that
// creates them). RLS enforces who can view vs. edit; these helpers just
// shape the client calls.
import type { SupabaseClient } from "@supabase/supabase-js";
import { IpsRoleGroup } from "@/lib/ips-role-groups";

export type IpsNoteType = "General" | "Action" | "Risk" | "Decision";

export interface IpsMeeting {
  id: string;
  meetingDate: string;
  status: "open" | "closed";
  createdBy: string | null;
  previousMeetingId: string | null;
  createdAt: string;
}

export interface IpsAllocation {
  id: string;
  meetingId: string;
  openRoleId: string;
  branchId: string;
  roleGroup: IpsRoleGroup;
  priority: string;
  candidateId: string | null;
  note: string | null;
  updatedBy: string | null;
  updatedAt: string;
}

export interface IpsMeetingNote {
  id: string;
  meetingId: string;
  noteType: IpsNoteType;
  body: string;
  resolved: boolean;
  authorId: string | null;
  carriedFromNoteId: string | null;
  createdAt: string;
}

export interface IpsBoardEditor {
  profileId: string;
  displayName: string | null;
  email: string;
  addedBy: string | null;
  createdAt: string;
}

interface MeetingRow {
  id: string;
  meeting_date: string;
  status: "open" | "closed";
  created_by: string | null;
  previous_meeting_id: string | null;
  created_at: string;
}

interface AllocationRow {
  id: string;
  meeting_id: string;
  open_role_id: string;
  branch_id: string;
  role_group: IpsRoleGroup;
  priority: string;
  candidate_id: string | null;
  note: string | null;
  updated_by: string | null;
  updated_at: string;
}

interface NoteRow {
  id: string;
  meeting_id: string;
  note_type: IpsNoteType;
  body: string;
  resolved: boolean;
  author_id: string | null;
  carried_from_note_id: string | null;
  created_at: string;
}

function rowToMeeting(row: MeetingRow): IpsMeeting {
  return {
    id: row.id,
    meetingDate: row.meeting_date,
    status: row.status,
    createdBy: row.created_by,
    previousMeetingId: row.previous_meeting_id,
    createdAt: row.created_at,
  };
}

export function rowToAllocation(row: AllocationRow): IpsAllocation {
  return {
    id: row.id,
    meetingId: row.meeting_id,
    openRoleId: row.open_role_id,
    branchId: row.branch_id,
    roleGroup: row.role_group,
    priority: row.priority,
    candidateId: row.candidate_id,
    note: row.note,
    updatedBy: row.updated_by,
    updatedAt: row.updated_at,
  };
}

export function rowToNote(row: NoteRow): IpsMeetingNote {
  return {
    id: row.id,
    meetingId: row.meeting_id,
    noteType: row.note_type,
    body: row.body,
    resolved: row.resolved,
    authorId: row.author_id,
    carriedFromNoteId: row.carried_from_note_id,
    createdAt: row.created_at,
  };
}

export async function fetchLatestMeeting(supabase: SupabaseClient): Promise<IpsMeeting | null> {
  const { data, error } = await supabase
    .from("ips_meetings")
    .select("*")
    .order("meeting_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[ips-meetings] fetchLatestMeeting failed:", error);
    return null;
  }
  return data ? rowToMeeting(data as MeetingRow) : null;
}

export async function fetchMeetingById(supabase: SupabaseClient, id: string): Promise<IpsMeeting | null> {
  const { data, error } = await supabase.from("ips_meetings").select("*").eq("id", id).maybeSingle();
  if (error || !data) {
    console.error("[ips-meetings] fetchMeetingById failed:", error);
    return null;
  }
  return rowToMeeting(data as MeetingRow);
}

/** Calls the create_ips_meeting_with_carryforward RPC (SETUP.md 4.7). RLS/the function itself reject non-editors. */
export async function createMeeting(
  supabase: SupabaseClient,
  meetingDate: string
): Promise<{ ok: boolean; meetingId?: string; error?: string }> {
  const { data, error } = await supabase.rpc("create_ips_meeting_with_carryforward", {
    p_meeting_date: meetingDate,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true, meetingId: data as string };
}

export async function fetchAllocations(supabase: SupabaseClient, meetingId: string): Promise<IpsAllocation[]> {
  const { data, error } = await supabase.from("ips_allocations").select("*").eq("meeting_id", meetingId);
  if (error) {
    console.error("[ips-meetings] fetchAllocations failed:", error);
    return [];
  }
  return (data as AllocationRow[]).map(rowToAllocation);
}

export interface NewAllocationSlot {
  openRoleId: string;
  branchId: string;
  roleGroup: IpsRoleGroup;
  priority: string;
}

/** Bulk-inserts slots derived from current Airtable OpenRoles that don't yet have a row in this meeting. */
export async function seedAllocationsForMeeting(
  supabase: SupabaseClient,
  meetingId: string,
  slots: NewAllocationSlot[]
): Promise<{ ok: boolean; error?: string }> {
  if (slots.length === 0) return { ok: true };
  const { error } = await supabase.from("ips_allocations").insert(
    slots.map((s) => ({
      meeting_id: meetingId,
      open_role_id: s.openRoleId,
      branch_id: s.branchId,
      role_group: s.roleGroup,
      priority: s.priority,
    }))
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function upsertAllocationCandidate(
  supabase: SupabaseClient,
  allocationId: string,
  fields: { candidateId?: string | null; note?: string | null },
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  const patch: Record<string, unknown> = { updated_by: userId };
  if (fields.candidateId !== undefined) patch.candidate_id = fields.candidateId;
  if (fields.note !== undefined) patch.note = fields.note;

  const { error } = await supabase.from("ips_allocations").update(patch).eq("id", allocationId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function fetchNotes(supabase: SupabaseClient, meetingId: string): Promise<IpsMeetingNote[]> {
  const { data, error } = await supabase
    .from("ips_meeting_notes")
    .select("*")
    .eq("meeting_id", meetingId)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[ips-meetings] fetchNotes failed:", error);
    return [];
  }
  return (data as NoteRow[]).map(rowToNote);
}

export async function createNote(
  supabase: SupabaseClient,
  meetingId: string,
  noteType: IpsNoteType,
  body: string,
  authorId: string
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from("ips_meeting_notes")
    .insert({ meeting_id: meetingId, note_type: noteType, body, author_id: authorId });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function resolveNote(supabase: SupabaseClient, noteId: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("ips_meeting_notes").update({ resolved: true }).eq("id", noteId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function fetchBoardEditors(supabase: SupabaseClient): Promise<IpsBoardEditor[]> {
  const { data, error } = await supabase
    .from("ips_board_editors")
    .select("profile_id, added_by, created_at, profiles!ips_board_editors_profile_id_fkey(display_name, email)");
  if (error) {
    console.error("[ips-meetings] fetchBoardEditors failed:", error);
    return [];
  }
  return (
    data as unknown as {
      profile_id: string;
      added_by: string | null;
      created_at: string;
      profiles: { display_name: string | null; email: string } | null;
    }[]
  ).map((row) => ({
    profileId: row.profile_id,
    displayName: row.profiles?.display_name ?? null,
    email: row.profiles?.email ?? "",
    addedBy: row.added_by,
    createdAt: row.created_at,
  }));
}

/** Manager-only: RLS rejects this for non-managers, even existing editors. */
export async function addBoardEditor(
  supabase: SupabaseClient,
  profileId: string,
  addedBy: string
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("ips_board_editors").insert({ profile_id: profileId, added_by: addedBy });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Manager-only: RLS rejects this for non-managers, even existing editors. */
export async function removeBoardEditor(supabase: SupabaseClient, profileId: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.from("ips_board_editors").delete().eq("profile_id", profileId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
