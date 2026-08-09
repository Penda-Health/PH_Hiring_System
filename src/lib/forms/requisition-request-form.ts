// Server-only data access for the public, no-login requisition-request
// links (/requisition-request/so and /requisition-request/ips). Unlike the
// other public forms in this directory, these aren't record-bound — anyone
// with the static link can submit a brand-new Requisition, which is
// immediately converted to an Open Role since approval/budget evaluation
// already happened over email before the link was shared.
import { createRecord, listRecords } from "@/lib/airtable/client";
import { TABLE_NAMES, F } from "@/lib/airtable/field-names";
import {
  branchFromAirtable,
  openRoleFromAirtable,
  requisitionFromAirtable,
  requisitionToAirtable,
  openRoleToAirtable,
} from "@/lib/airtable/mappers";
import { Requisition, Segment, OpenRole } from "@/types";
import { buildOpenRoleFromRequisition } from "@/lib/requisitions-helpers";
import { nextSequentialId } from "@/lib/airtable/route-handlers";

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
  // Same server-assigned sequential ID logic as the authenticated
  // POST /api/requisitions route (see route-handlers.ts) — `REQ-${Date.now()}`
  // previously minted 13-digit IDs that broke the REQ-NNN pattern every
  // other requisition (and the nextSequentialId scan itself) expects.
  const reqId = await nextSequentialId(
    TABLE_NAMES.Requisitions,
    { airtableField: F.Requisitions.REQ_ID, prefix: "REQ", pad: 3, min: 6 },
    {}
  );
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

  // Same server-assigned Role ID logic as POST /api/open-roles — previously
  // the record was created with no Role ID at all, leaving it blank/
  // inconsistent with every other Open Role.
  const roleId = await nextSequentialId(
    TABLE_NAMES.OpenRoles,
    { airtableField: F.OpenRoles.ROLE_ID, prefix: (body: Partial<OpenRole>) => (body.segment === "SO" ? "SO" : "IPS"), pad: 3 },
    openRolePayload
  );
  const openRoleFields = openRoleToAirtable(openRolePayload);
  openRoleFields[F.OpenRoles.ROLE_ID] = roleId;

  const createdRoleRecord = await createRecord(TABLE_NAMES.OpenRoles, openRoleFields);

  return { requisitionId: requisition.id, openRoleId: createdRoleRecord.id };
}
