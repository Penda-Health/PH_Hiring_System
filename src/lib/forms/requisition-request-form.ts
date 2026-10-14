// Server-only data access for the public, no-login requisition-request
// links (/requisition-request/so and /requisition-request/ips). Unlike the
// other public forms in this directory, these aren't record-bound — anyone
// signed in with a Penda Google account can submit a brand-new Requisition,
// which then goes through the same approval workflow as an in-app one.
import { listRecords } from "@/lib/airtable/client";
import { TABLE_NAMES } from "@/lib/airtable/field-names";
import { branchFromAirtable, openRoleFromAirtable } from "@/lib/airtable/mappers";
import { Segment } from "@/types";
import { createRequisitionWithApproval, NewRequisitionInput } from "@/lib/requisitions/approval";

export async function loadActiveBranches(
  segment: Segment
): Promise<{ id: string; name: string; city: string; regionalManager: string; branchManager: string }[]> {
  const records = await listRecords(TABLE_NAMES.Branches);
  return records
    .map(branchFromAirtable)
    .filter((b) => b.active && b.segment === segment)
    // RM/BM names (never emails) so the form can show who'll approve.
    .map((b) => ({ id: b.id, name: b.name, city: b.city, regionalManager: b.regionalManager, branchManager: b.branchManager }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Distinct existing Open Role titles for a segment, used to power role-title autocomplete suggestions. */
export async function loadRoleTitleSuggestions(segment: Segment): Promise<string[]> {
  const records = await listRecords(TABLE_NAMES.OpenRoles);
  const titles = records.map(openRoleFromAirtable).filter((r) => r.segment === segment).map((r) => r.title);
  return Array.from(new Set(titles)).sort((a, b) => a.localeCompare(b));
}

/**
 * Creates a public-link requisition and starts its approval workflow — the
 * same path as the in-app forms (src/lib/requisitions/approval.ts). It only
 * becomes an Open Role once every configured approver has signed off.
 * `submitterEmail` must already be a verified Google identity (see the
 * public route).
 */
export async function submitPublicRequisitionRequest(
  input: Omit<NewRequisitionInput, "submittedBy" | "submittedAt" | "source">
): Promise<{ requisitionId: string; reqId: string }> {
  const requisition = await createRequisitionWithApproval({
    ...input,
    submittedBy: input.submitterName ?? "",
    submittedAt: new Date().toISOString(),
    source: "public-link",
  });
  return { requisitionId: requisition.id, reqId: requisition.reqId };
}
