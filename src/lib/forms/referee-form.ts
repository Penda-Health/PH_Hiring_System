// Server-only data access for the public, no-login referee reference-check
// form, prefilled from a signed token rather than a Supabase session.
import { getRecord, updateRecord, cleanFields } from "@/lib/airtable/client";
import { TABLE_NAMES, F } from "@/lib/airtable/field-names";
import { candidateFromAirtable, openRoleFromAirtable, referenceCheckFromAirtable } from "@/lib/airtable/mappers";
import { RehireAnswer } from "@/types";

export type RefereeFormData = {
  candidateName: string;
  roleTitle: string;
  refereeName: string;
  alreadySubmitted: boolean;
};

export async function loadRefereeFormData(refCheckId: string, refereeNum: 1 | 2): Promise<RefereeFormData | null> {
  const record = await getRecord(TABLE_NAMES.ReferenceChecks, refCheckId);
  if (!record) return null;
  const refCheck = referenceCheckFromAirtable(record);

  const candidateRecord = await getRecord(TABLE_NAMES.Candidates, refCheck.candidateId);
  const candidate = candidateFromAirtable(candidateRecord);

  let roleTitle = "";
  if (candidate.roleId) {
    const roleRecord = await getRecord(TABLE_NAMES.OpenRoles, candidate.roleId);
    roleTitle = openRoleFromAirtable(roleRecord).title;
  }

  const referee = refereeNum === 1 ? refCheck.referee1 : refCheck.referee2;

  return {
    candidateName: candidate.name,
    roleTitle,
    refereeName: referee.name,
    alreadySubmitted: referee.responded,
  };
}

export type RefereeSubmission = {
  relationship: string;
  durationKnown: string;
  techScore: number;
  reliabilityScore: number;
  teamworkScore: number;
  wouldRehire: RehireAnswer;
  strengthExample: string;
  developmentAreas?: string;
  notes?: string;
};

export async function submitRefereeForm(
  refCheckId: string,
  refereeNum: 1 | 2,
  submission: RefereeSubmission
): Promise<void> {
  const prefix = refereeNum === 1 ? "REFEREE1" : "REFEREE2";
  const keys = F.ReferenceChecks as Record<string, string>;
  await updateRecord(
    TABLE_NAMES.ReferenceChecks,
    refCheckId,
    cleanFields({
      [keys[`${prefix}_RESPONDED`]]: true,
      [keys[`${prefix}_RESPONDED_AT`]]: new Date().toISOString().slice(0, 10),
      [keys[`${prefix}_RELATIONSHIP`]]: submission.relationship,
      [keys[`${prefix}_DURATION_KNOWN`]]: submission.durationKnown,
      [keys[`${prefix}_TECH_SCORE`]]: submission.techScore,
      [keys[`${prefix}_RELIABILITY_SCORE`]]: submission.reliabilityScore,
      [keys[`${prefix}_TEAMWORK_SCORE`]]: submission.teamworkScore,
      [keys[`${prefix}_WOULD_REHIRE`]]: submission.wouldRehire,
      [keys[`${prefix}_STRENGTH_EXAMPLE`]]: submission.strengthExample,
      [keys[`${prefix}_DEVELOPMENT_AREAS`]]: submission.developmentAreas,
      [keys[`${prefix}_NOTES`]]: submission.notes,
    })
  );
}
