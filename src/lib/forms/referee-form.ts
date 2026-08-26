// Server-only data access for the public, no-login referee reference-check
// form, prefilled from a signed token rather than a Supabase session.
import { getRecord, updateRecord, cleanFields } from "@/lib/airtable/client";
import { TABLE_NAMES, F } from "@/lib/airtable/field-names";
import { candidateFromAirtable, openRoleFromAirtable, referenceCheckFromAirtable } from "@/lib/airtable/mappers";
import { RehireAnswer, ReferenceCheckStatus } from "@/types";

export type RefereeFormData = {
  candidateName: string;
  roleTitle: string;
  refereeName: string;
  refereeEmail: string;
  alreadySubmitted: boolean;
  googleVerified: boolean;
};

export async function loadRefereeFormData(refCheckId: string, refereeNum: 1 | 2): Promise<RefereeFormData | null> {
  const record = await getRecord(TABLE_NAMES.ReferenceChecks, refCheckId);
  if (!record) return null;
  const refCheck = referenceCheckFromAirtable(record);

  const candidateRecord = await getRecord(TABLE_NAMES.Candidates, refCheck.candidateId);
  // A reference check's linked candidate should always exist — if it 404s,
  // the data itself is broken, which is a real server error, not a routine
  // not-found the caller should treat as "form not found".
  if (!candidateRecord) throw new Error(`Candidate ${refCheck.candidateId} not found for reference check ${refCheckId}`);
  const candidate = candidateFromAirtable(candidateRecord);

  let roleTitle = "";
  if (candidate.roleId) {
    const roleRecord = await getRecord(TABLE_NAMES.OpenRoles, candidate.roleId);
    roleTitle = roleRecord ? openRoleFromAirtable(roleRecord).title : "";
  }

  const referee = refereeNum === 1 ? refCheck.referee1 : refCheck.referee2;

  return {
    candidateName: candidate.name,
    roleTitle,
    refereeName: referee.name,
    refereeEmail: referee.email,
    alreadySubmitted: referee.responded,
    googleVerified: !!referee.googleVerified || !!referee.googleVerifiedOverrideBy,
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
  developmentAreas: string;
  notes?: string;
};

// Records the outcome of a Google Identity Services sign-in attempt for one
// referee slot. Persisted immediately (not just returned to the client) so
// the later POST /api/public/referee submit can re-check that verification
// actually happened server-side, rather than trusting a client-side flag —
// see google-verify.ts. `googleVerifiedEmail` is stamped on every attempt
// (even a mismatch) so TA has visibility into what account was tried when
// deciding whether to override.
export async function recordGoogleVerification(
  refCheckId: string,
  refereeNum: 1 | 2,
  googleEmail: string
): Promise<{ verified: boolean; refereeEmailOnFile: string }> {
  const record = await getRecord(TABLE_NAMES.ReferenceChecks, refCheckId);
  if (!record) throw new Error(`Reference check ${refCheckId} not found`);
  const refCheck = referenceCheckFromAirtable(record);
  const referee = refereeNum === 1 ? refCheck.referee1 : refCheck.referee2;
  const prefix = refereeNum === 1 ? "REFEREE1" : "REFEREE2";
  const keys = F.ReferenceChecks as Record<string, string>;

  const matches = referee.email.trim().toLowerCase() === googleEmail.trim().toLowerCase();
  await updateRecord(
    TABLE_NAMES.ReferenceChecks,
    refCheckId,
    cleanFields({
      [keys[`${prefix}_GOOGLE_VERIFIED_EMAIL`]]: googleEmail,
      [keys[`${prefix}_GOOGLE_VERIFIED`]]: matches,
    })
  );
  return { verified: matches, refereeEmailOnFile: referee.email };
}

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

  // Recompute the derived status and, at 2 responses, auto-advance the
  // candidate's pipeline stage to Offer. Re-read fresh rather than trusting
  // the pre-update in-memory refCheck, since the write above just changed
  // this referee's `responded` flag.
  const fresh = await getRecord(TABLE_NAMES.ReferenceChecks, refCheckId);
  if (!fresh) return;
  const refCheck = referenceCheckFromAirtable(fresh);
  const respondedCount = [refCheck.referee1.responded, refCheck.referee2.responded].filter(Boolean).length;
  const nextStatus: ReferenceCheckStatus =
    respondedCount >= 2 ? "Ready for Offer" : respondedCount === 1 ? "1 Referee In" : refCheck.status;

  if (nextStatus !== refCheck.status) {
    await updateRecord(
      TABLE_NAMES.ReferenceChecks,
      refCheckId,
      cleanFields({ [F.ReferenceChecks.STATUS]: nextStatus })
    );
  }

  if (nextStatus === "Ready for Offer") {
    const candidateRecord = await getRecord(TABLE_NAMES.Candidates, refCheck.candidateId);
    if (candidateRecord) {
      const candidate = candidateFromAirtable(candidateRecord);
      // Guarded: only auto-advance while the candidate is still sitting at
      // Reference Check — never overwrite a stage a recruiter already
      // changed by hand (Hired, Rejected, Withdrawn, or moved back/forward).
      if (candidate.stage === "Reference Check") {
        await updateRecord(
          TABLE_NAMES.Candidates,
          refCheck.candidateId,
          cleanFields({ [F.Candidates.STAGE]: "Offer" })
        );
      }
    }
  }
}
