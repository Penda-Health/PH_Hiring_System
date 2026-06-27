// Server-only data access for the public, no-login requisition-request
// links (/requisition-request/so and /requisition-request/ips). Unlike the
// other public forms in this directory, these aren't record-bound — anyone
// with the static link can submit a brand-new Requisition, which is
// immediately converted to an Open Role since approval/budget evaluation
// already happened over email before the link was shared.
import { createRecord, listRecords } from "@/lib/airtable/client";
import { TABLE_NAMES } from "@/lib/airtable/field-names";
import {
  branchFromAirtable,
  openRoleFromAirtable,
  requisitionFromAirtable,
  requisitionToAirtable,
  openRoleToAirtable,
} from "@/lib/airtable/mappers";
import { Requisition, Segment } from "@/types";
import { buildOpenRoleFromRequisition } from "@/lib/requisitions-helpers";

export async function loadActiveBranches(): Promise<{ id: string; name: string; city: string }[]> {
  const records = await listRecords(TABLE_NAMES.Branches);
  return records
    .map(branchFromAirtable)
    .filter((b) => b.active)
    .map((b) => ({ id: b.id, name: b.name, city: b.city }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Distinct existing Open Role titles for a segment, used to power role-title autocomplete suggestions. */
export async function loadRoleTitleSuggestions(segment: Segment): Promise<string[]> {
  const records = await listRecords(TABLE_NAMES.OpenRoles);
  const titles = records.map(openRoleFromAirtable).filter((r) => r.segment === segment).map((r) => r.title);
  return Array.from(new Set(titles)).sort((a, b) => a.localeCompare(b));
}

/**
 * Creates the Requisition (already approved/converted, no approver chain)
 * and the matching Open Role in one call, mirroring the in-app
 * convertToOpenRole() flow but with no logged-in user driving it.
 */
export async function submitPublicRequisitionRequest(
  input: Omit<Requisition, "id" | "reqId" | "status" | "approverChain" | "currentApproverIndex" | "submittedBy" | "submittedAt">
): Promise<{ requisitionId: string; openRoleId: string }> {
  const reqId = `REQ-${Date.now()}`;
  const requisitionPayload: Partial<Requisition> = {
    ...input,
    reqId,
    status: "Converted to Open Role",
    approverChain: [],
    currentApproverIndex: 0,
    submittedBy: input.submitterName ?? "",
    submittedAt: new Date().toISOString(),
    source: "public-link",
  };

  const createdReqRecord = await createRecord(TABLE_NAMES.Requisitions, requisitionToAirtable(requisitionPayload));
  const requisition = requisitionFromAirtable(createdReqRecord);

  const branches = await listRecords(TABLE_NAMES.Branches).then((records) => records.map(branchFromAirtable));
  const openRolePayload = buildOpenRoleFromRequisition(requisition, branches, { isPublicSubmission: true });

  const createdRoleRecord = await createRecord(TABLE_NAMES.OpenRoles, openRoleToAirtable(openRolePayload));

  return { requisitionId: requisition.id, openRoleId: createdRoleRecord.id };
}
