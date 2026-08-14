// Best-effort audit trail for every hard delete against an Airtable-backed
// resource — see SETUP.md section 4.8 for the `deleted_items` table this
// writes to. This is a backstop for staff manually reconstructing a record
// days later (see the Gladys work-trial incident this was built for), not
// the primary undo path — that's the 30s toast in undo-toast.tsx, which
// avoids the Airtable delete happening at all if the user catches it in time.
import { createSupabaseServerClient } from "./server";

// Snapshot is the already-shaped app entity (post-fromAirtable), not the raw
// Airtable record, so a future read of this table doesn't also need to know
// each table's field-name mapping to be useful.
export async function archiveDeletedRecord(
  resource: string,
  recordId: string,
  snapshot: unknown
): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) return; // Supabase not provisioned yet — see SETUP.md sections 2-4.
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error } = await supabase.from("deleted_items").insert({
      resource,
      record_id: recordId,
      snapshot,
      deleted_by: user?.id ?? null,
    });
    if (error) throw error;
  } catch (err) {
    // Never let a failed archive write block the delete itself — losing the
    // audit trail for one record is far better than a delete button that
    // silently stops working because Supabase hiccupped.
    console.error(`Failed to archive deleted ${resource}/${recordId} to Supabase:`, err);
  }
}
