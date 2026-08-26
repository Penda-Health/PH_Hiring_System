// Server-only data access for the public, no-login "add your own referees"
// form (Path B of the two reference-check initiation paths — see
// SETUP.md). Candidates fill this in themselves; nothing is emailed to a
// referee until a TA reviews and verifies it (see verifyAndInitiateReferenceCheck
// in recruitment-context.tsx).
import { getRecord, createRecord, listRecords } from "@/lib/airtable/client";
import { TABLE_NAMES } from "@/lib/airtable/field-names";
import {
  candidateFromAirtable,
  openRoleFromAirtable,
  referenceCheckFromAirtable,
  referenceCheckToAirtable,
} from "@/lib/airtable/mappers";
import { ReferenceCheck } from "@/types";

export type ReferenceCheckRequestFormData = {
  candidateName: string;
  roleTitle: string;
  // True once this candidate already has a reference check on file — the
  // form is single-shot; resubmitting would create a duplicate record.
  alreadySubmitted: boolean;
};

export async function loadReferenceCheckRequestData(candidateId: string): Promise<ReferenceCheckRequestFormData | null> {
  const candidateRecord = await getRecord(TABLE_NAMES.Candidates, candidateId);
  if (!candidateRecord) return null;
  const candidate = candidateFromAirtable(candidateRecord);

  let roleTitle = "";
  if (candidate.roleId) {
    const roleRecord = await getRecord(TABLE_NAMES.OpenRoles, candidate.roleId);
    roleTitle = roleRecord ? openRoleFromAirtable(roleRecord).title : "";
  }

  // Full-table scan rather than a filterByFormula lookup: Airtable's linked-
  // record formulas match on the linked table's *primary field* (candId
  // here), which is more fragile than just comparing the resolved
  // candidateId in JS once the records are back. This table isn't large
  // enough for that to matter.
  const allChecks = await listRecords(TABLE_NAMES.ReferenceChecks);
  const alreadySubmitted = allChecks
    .map(referenceCheckFromAirtable)
    .some((rc) => rc.candidateId === candidateId);

  return {
    candidateName: candidate.name,
    roleTitle,
    alreadySubmitted,
  };
}

export type ReferenceCheckRequestSubmission = {
  referee1: { name: string; email: string; phone: string };
  referee2: { name: string; email: string; phone: string };
};

export async function submitReferenceCheckRequest(
  candidateId: string,
  submission: ReferenceCheckRequestSubmission
): Promise<void> {
  const now = new Date().toISOString();
  const refCheck: Partial<ReferenceCheck> = {
    candidateId,
    referee1: { ...submission.referee1, emailSent: false, smsSent: false, responded: false },
    referee2: { ...submission.referee2, emailSent: false, smsSent: false, responded: false },
    outcome: "Pending",
    driveFolderUrl: null,
    createdAt: now,
    source: "Candidate Submitted",
    status: "Awaiting Verification",
    verifiedAt: null,
    verifiedBy: null,
    initiatedAt: null,
  };
  await createRecord(TABLE_NAMES.ReferenceChecks, referenceCheckToAirtable(refCheck));
}
