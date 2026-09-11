// Server-only data access for the public, no-login referee reference-check
// form, prefilled from a signed token rather than a Supabase session.
import { getRecord, updateRecord, cleanFields } from "@/lib/airtable/client";
import { TABLE_NAMES, F } from "@/lib/airtable/field-names";
import { candidateFromAirtable, openRoleFromAirtable, referenceCheckFromAirtable } from "@/lib/airtable/mappers";
import { RehireAnswer, ReferenceCheckStatus, Segment } from "@/types";

export type RefereeFormData = {
  candidateName: string;
  roleTitle: string;
  /** The role's assigned recruiter — shown on the redesigned form's intro screen ("Requested by ..."). */
  recruiterName: string;
  /** Gates the clinical-only compliance/license questions (step 3) to IPS roles. "" if the candidate has none on file. */
  segment: Segment | "";
  refereeName: string;
  refereeEmail: string;
  alreadySubmitted: boolean;
  googleVerified: boolean;
};

export async function loadRefereeFormData(refCheckId: string, refereeNum: 1 | 2 | 3 | 4): Promise<RefereeFormData | null> {
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
  let recruiterName = "";
  if (candidate.roleId) {
    const roleRecord = await getRecord(TABLE_NAMES.OpenRoles, candidate.roleId);
    if (roleRecord) {
      const role = openRoleFromAirtable(roleRecord);
      roleTitle = role.title;
      recruiterName = role.recruiter;
    }
  }

  const referee = refCheck.referees[refereeNum - 1];
  if (!referee) return null;

  return {
    candidateName: candidate.name,
    roleTitle,
    recruiterName,
    segment: candidate.segment ?? "",
    refereeName: referee.name,
    refereeEmail: referee.email,
    alreadySubmitted: referee.responded,
    googleVerified: !!referee.googleVerified || !!referee.googleVerifiedOverrideBy,
  };
}

export type RefereeSubmission = {
  relationship: string;
  directlySupervised: boolean;
  durationKnown: string;
  employmentFrom?: string;
  employmentTo?: string;
  stillEmployed: boolean;
  techScore: number;
  reliabilityScore: number;
  teamworkScore: number;
  problemSolvingScore: number;
  adaptabilityScore: number;
  wouldRehire: RehireAnswer;
  strengthsAndDevelopment: string;
  conflictExample: string;
  honestyConcerns: "No concerns" | "Some concerns" | "Prefer to discuss by phone";
  // Clinical (IPS) roles only — the form omits these for Support Office referees.
  complianceIncidents?: "None that I know of" | "Yes" | "Prefer to discuss by phone";
  licenseStanding?: "Yes" | "No" | "N/A" | "Not sure";
  preferPhoneNumber?: string;
  overallRecommendScore: number;
  consentToContact: boolean;
  notes?: string;
};

// Records the outcome of a Google Identity Services sign-in attempt for one
// referee slot. Persisted immediately (not just returned to the client) so
// the later POST /api/public/referee submit can re-check that verification
// actually happened server-side, rather than trusting a client-side flag —
// see google-verify.ts. `googleVerifiedEmail` is stamped on every attempt
// (even a mismatch) so TA has visibility into what account was tried when
// deciding whether to override.
const REFEREE_NUM_PREFIXES = ["REFEREE1", "REFEREE2", "REFEREE3", "REFEREE4"] as const;

export async function recordGoogleVerification(
  refCheckId: string,
  refereeNum: 1 | 2 | 3 | 4,
  googleEmail: string
): Promise<{ verified: boolean; refereeEmailOnFile: string }> {
  const record = await getRecord(TABLE_NAMES.ReferenceChecks, refCheckId);
  if (!record) throw new Error(`Reference check ${refCheckId} not found`);
  const refCheck = referenceCheckFromAirtable(record);
  const referee = refCheck.referees[refereeNum - 1];
  if (!referee) throw new Error(`Referee ${refereeNum} not found on reference check ${refCheckId}`);
  const prefix = REFEREE_NUM_PREFIXES[refereeNum - 1];
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
  refereeNum: 1 | 2 | 3 | 4,
  submission: RefereeSubmission
): Promise<void> {
  const prefix = REFEREE_NUM_PREFIXES[refereeNum - 1];
  const keys = F.ReferenceChecks as Record<string, string>;
  await updateRecord(
    TABLE_NAMES.ReferenceChecks,
    refCheckId,
    cleanFields({
      [keys[`${prefix}_RESPONDED`]]: true,
      [keys[`${prefix}_RESPONDED_AT`]]: new Date().toISOString().slice(0, 10),
      [keys[`${prefix}_RELATIONSHIP`]]: submission.relationship,
      [keys[`${prefix}_DIRECTLY_SUPERVISED`]]: submission.directlySupervised,
      [keys[`${prefix}_DURATION_KNOWN`]]: submission.durationKnown,
      [keys[`${prefix}_EMPLOYMENT_FROM`]]: submission.employmentFrom,
      [keys[`${prefix}_EMPLOYMENT_TO`]]: submission.employmentTo,
      [keys[`${prefix}_STILL_EMPLOYED`]]: submission.stillEmployed,
      [keys[`${prefix}_TECH_SCORE`]]: submission.techScore,
      [keys[`${prefix}_RELIABILITY_SCORE`]]: submission.reliabilityScore,
      [keys[`${prefix}_TEAMWORK_SCORE`]]: submission.teamworkScore,
      [keys[`${prefix}_PROBLEM_SOLVING_SCORE`]]: submission.problemSolvingScore,
      [keys[`${prefix}_ADAPTABILITY_SCORE`]]: submission.adaptabilityScore,
      [keys[`${prefix}_WOULD_REHIRE`]]: submission.wouldRehire,
      [keys[`${prefix}_STRENGTHS_AND_DEVELOPMENT`]]: submission.strengthsAndDevelopment,
      [keys[`${prefix}_CONFLICT_EXAMPLE`]]: submission.conflictExample,
      [keys[`${prefix}_HONESTY_CONCERNS`]]: submission.honestyConcerns,
      [keys[`${prefix}_COMPLIANCE_INCIDENTS`]]: submission.complianceIncidents,
      [keys[`${prefix}_LICENSE_STANDING`]]: submission.licenseStanding,
      [keys[`${prefix}_PREFER_PHONE_NUMBER`]]: submission.preferPhoneNumber,
      [keys[`${prefix}_OVERALL_RECOMMEND_SCORE`]]: submission.overallRecommendScore,
      [keys[`${prefix}_CONSENT_TO_CONTACT`]]: submission.consentToContact,
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
  const respondedCount = refCheck.referees.filter((r) => r.responded).length;
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
