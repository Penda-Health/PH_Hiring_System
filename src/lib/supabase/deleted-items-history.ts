// Client-safe reads against the `deleted_items` audit table (SETUP.md
// section 4.8 has the schema; archiveDeletedRecord() in deleted-items.ts is
// the write side). Kept in its own file because deleted-items.ts also pulls
// in createSupabaseServerClient() (which needs next/headers) — bundling that
// into a client component fails, so this file only takes a SupabaseClient
// the caller already has, same pattern as profiles.ts.
import type { SupabaseClient } from "@supabase/supabase-js";

export interface DeletedItem {
  id: string;
  resource: string;
  recordId: string;
  snapshot: Record<string, unknown>;
  deletedBy: string | null;
  deletedByName: string | null;
  deletedAt: string;
}

interface DeletedItemRow {
  id: string;
  resource: string;
  record_id: string;
  snapshot: Record<string, unknown>;
  deleted_by: string | null;
  deleted_at: string;
}

// RLS on `deleted_items` already restricts reads to recruitment_manager (see
// SETUP.md 4.8) — this is just the query shape, not the access control.
export async function listRecentDeletedItems(supabase: SupabaseClient, days = 7): Promise<DeletedItem[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("deleted_items")
    .select("id, resource, record_id, snapshot, deleted_by, deleted_at")
    .gte("deleted_at", since)
    .order("deleted_at", { ascending: false });
  if (error) {
    console.error("[deleted-items] listRecentDeletedItems failed:", error);
    return [];
  }
  const rows = (data ?? []) as DeletedItemRow[];

  // Resolve deleted_by -> a display name as a second pass rather than a
  // nested select, to stay on the same plain .select()/.in() shape the rest
  // of this app's Supabase helpers use (see profiles.ts) instead of relying
  // on PostgREST embedding syntax nothing here has exercised yet.
  const deleterIds = Array.from(new Set(rows.map((r) => r.deleted_by).filter((id): id is string => !!id)));
  const namesById = new Map<string, string>();
  if (deleterIds.length > 0) {
    const { data: deleters } = await supabase.from("profiles").select("id, display_name, email").in("id", deleterIds);
    for (const d of deleters ?? []) namesById.set(d.id, d.display_name ?? d.email);
  }

  return rows.map((row) => ({
    id: row.id,
    resource: row.resource,
    recordId: row.record_id,
    snapshot: row.snapshot,
    deletedBy: row.deleted_by,
    deletedByName: row.deleted_by ? namesById.get(row.deleted_by) ?? null : null,
    deletedAt: row.deleted_at,
  }));
}

// Best-effort human label pulled from the snapshot. Different resources
// shape differently — e.g. a WorkTrial snapshot has no name of its own, just
// a candidateId link into Airtable — so this tries the fields that cover
// most of the 11 resources before falling back to the raw record id.
export function describeSnapshot(snapshot: Record<string, unknown>, recordId: string): string {
  const fields = ["name", "candidateName", "wtId", "relieverId", "locumId", "candId"];
  for (const field of fields) {
    const value = snapshot[field];
    if (typeof value === "string" && value.trim()) return value;
  }
  return recordId;
}
