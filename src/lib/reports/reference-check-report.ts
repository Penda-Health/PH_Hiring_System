// Data access for the individual reference-check PDF report (dashboard-only,
// authenticated). Unlike the work-trial report, a partial report (only one
// referee has responded) is a valid, useful thing to generate — there's no
// all-or-nothing gate here, just a "at least one referee responded" floor
// enforced by the route handler.
import { getRecord } from "@/lib/airtable/client";
import { TABLE_NAMES } from "@/lib/airtable/field-names";
import { candidateFromAirtable, openRoleFromAirtable, referenceCheckFromAirtable } from "@/lib/airtable/mappers";
import { RefereeStatus, ReferenceCheckStatus } from "@/types";

export type ReferenceCheckReportData = {
  refId: string;
  candidateName: string;
  roleTitle: string;
  status: ReferenceCheckStatus;
  outcome: "Pending" | "Positive" | "Negative" | "Mixed";
  createdAt: string;
  referee1: RefereeStatus;
  referee2: RefereeStatus;
};

export async function loadReferenceCheckReportData(refCheckId: string): Promise<ReferenceCheckReportData | null> {
  const record = await getRecord(TABLE_NAMES.ReferenceChecks, refCheckId);
  if (!record) return null;
  const refCheck = referenceCheckFromAirtable(record);

  const candidateRecord = await getRecord(TABLE_NAMES.Candidates, refCheck.candidateId);
  if (!candidateRecord) throw new Error(`Candidate ${refCheck.candidateId} not found for reference check ${refCheckId}`);
  const candidate = candidateFromAirtable(candidateRecord);

  let roleTitle = "";
  if (candidate.roleId) {
    const roleRecord = await getRecord(TABLE_NAMES.OpenRoles, candidate.roleId);
    roleTitle = roleRecord ? openRoleFromAirtable(roleRecord).title : "";
  }

  return {
    refId: refCheck.refId,
    candidateName: candidate.name,
    roleTitle,
    status: refCheck.status,
    outcome: refCheck.outcome,
    createdAt: refCheck.createdAt,
    referee1: refCheck.referee1,
    referee2: refCheck.referee2,
  };
}
