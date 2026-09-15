// Server-only data access for the public, no-login referee reference-check
// form, prefilled from a signed token rather than a Supabase session.
import { getRecord, updateRecord, cleanFields, uploadAttachment } from "@/lib/airtable/client";
import { TABLE_NAMES, F } from "@/lib/airtable/field-names";
import {
  candidateFromAirtable,
  openRoleFromAirtable,
  referenceCheckFromAirtable,
  referenceCheckToAirtable,
} from "@/lib/airtable/mappers";
import { RecommendHireAnswer, ReferenceCheckStatus, Segment } from "@/types";
import { loadReferenceCheckReportData } from "@/lib/reports/reference-check-report";
import { generateReferenceCheckReportPdf } from "@/lib/reports/reference-check-report-pdf";
import { generateReferenceCheckInsights } from "@/lib/ai/reference-check-summary";

export type RefereeFormData = {
  candidateName: string;
  roleTitle: string;
  /** The role's assigned recruiter — shown on the redesigned form's intro screen ("Requested by ..."). */
  recruiterName: string;
  /** Gates the clinical-only compliance/license questions (step 3) to IPS roles. "" if the candidate has none on file. */
  segment: Segment | "";
  refereeName: string;
  refereeEmail: string;
  /** Phone number captured at intake, if any — prefills step 2's phone field so the referee only has to confirm/correct it. */
  refereePhone: string;
  alreadySubmitted: boolean;
  googleVerified: boolean;
  /** Opaque autosaved-draft blob from a previous session on this (or another) device — see saveRefereeDraft / referee-draft.ts. Null if no draft has been saved server-side yet. */
  draftJson: string | null;
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
    refereePhone: referee.phone,
    alreadySubmitted: referee.responded,
    googleVerified: !!referee.googleVerified || !!referee.googleVerifiedOverrideBy,
    draftJson: referee.draftJson ?? null,
  };
}

export type RefereeSubmission = {
  relationship: string;
  // Replaces the old standalone `directlySupervised` yes/no question —
  // `directlySupervised` itself is now derived server-side (see below) from
  // this answer, rather than asked directly.
  reportingRelationship:
    | "Reported directly to me"
    | "Reported to someone else, but I worked closely with them"
    | "We were peers / colleagues"
    | "I reported to them";
  refereeOrganization: string;
  /** The referee's own confirmed/corrected phone number (prefilled from intake — see RefereeFormData.refereePhone). */
  phone?: string;
  durationKnown: string;
  interactionFrequency: "Daily" | "A few times a week" | "Weekly" | "A few times a month" | "Rarely";
  jobTitleRecalled: string;
  employmentFrom?: string;
  employmentTo?: string;
  stillEmployed: boolean;
  mainResponsibilities: string;
  reportedTo?: string;
  leavingReason: "Still employed there" | "Resigned" | "Contract ended" | "Laid off / restructuring" | "Terminated" | "Not sure";
  executionScore: number;
  executionExample: string;
  teamworkScore: number;
  teamworkExample: string;
  communicationScore: number;
  communicationExample: string;
  wouldRehire: "Yes" | "With reservations" | "No";
  wouldRehireExplanation: string;
  topStrengths: string;
  coachingArea: string;
  feedbackResponse: "Openly, and applied it" | "Mixed" | "Defensively";
  honestyConcerns: "No concerns" | "Some concerns" | "Prefer to discuss by phone";
  // Clinical (IPS) roles only — the form omits these for Support Office referees.
  complianceIncidents?: "None that I know of" | "Yes" | "Prefer to discuss by phone";
  licenseStanding?: "Yes" | "No" | "N/A" | "Not sure";
  preferPhoneNumber?: string;
  recommendHire: RecommendHireAnswer;
  consentToContact: boolean;
  notes?: string;
};

// Records the outcome of an identity-provider sign-in attempt for one
// referee slot — called from both verify-google/route.ts (Google Identity
// Services) and verify-yahoo/callback/route.ts (Yahoo OAuth); which
// provider ran is decided client-side by email-provider.ts, but this
// function itself doesn't care which one produced `verifiedEmail`, only
// whether it matches the email on file. The Airtable fields stay named
// "Google Verified" for both (no schema change needed — provider is
// re-derivable later from the verified email's domain, see
// reference-check-report-pdf.ts). Persisted immediately (not just returned
// to the client) so the later POST /api/public/referee submit can re-check
// that verification actually happened server-side, rather than trusting a
// client-side flag — see google-verify.ts / yahoo-verify.ts.
// `googleVerifiedEmail` is stamped on every attempt (even a mismatch) so TA
// has visibility into what account was tried when deciding whether to
// override.
const REFEREE_NUM_PREFIXES = ["REFEREE1", "REFEREE2", "REFEREE3", "REFEREE4"] as const;

export async function recordGoogleVerification(
  refCheckId: string,
  refereeNum: 1 | 2 | 3 | 4,
  verifiedEmail: string
): Promise<{ verified: boolean; refereeEmailOnFile: string }> {
  const record = await getRecord(TABLE_NAMES.ReferenceChecks, refCheckId);
  if (!record) throw new Error(`Reference check ${refCheckId} not found`);
  const refCheck = referenceCheckFromAirtable(record);
  const referee = refCheck.referees[refereeNum - 1];
  if (!referee) throw new Error(`Referee ${refereeNum} not found on reference check ${refCheckId}`);
  const prefix = REFEREE_NUM_PREFIXES[refereeNum - 1];
  const keys = F.ReferenceChecks as Record<string, string>;

  const matches = referee.email.trim().toLowerCase() === verifiedEmail.trim().toLowerCase();
  await updateRecord(
    TABLE_NAMES.ReferenceChecks,
    refCheckId,
    cleanFields({
      [keys[`${prefix}_GOOGLE_VERIFIED_EMAIL`]]: verifiedEmail,
      [keys[`${prefix}_GOOGLE_VERIFIED`]]: matches,
    })
  );
  return { verified: matches, refereeEmailOnFile: referee.email };
}

// Lightweight, single-field write for the cross-device autosave draft —
// deliberately not routed through referenceCheckToAirtable's "rewrite every
// referee field" helper (see mappers.ts), since this fires on a debounce
// while the referee is still actively typing and only ever needs to touch
// one field. Mirrors recordGoogleVerification above for the same reason.
export async function saveRefereeDraft(
  refCheckId: string,
  refereeNum: 1 | 2 | 3 | 4,
  draftJson: string
): Promise<void> {
  const prefix = REFEREE_NUM_PREFIXES[refereeNum - 1];
  const keys = F.ReferenceChecks as Record<string, string>;
  await updateRecord(
    TABLE_NAMES.ReferenceChecks,
    refCheckId,
    cleanFields({ [keys[`${prefix}_DRAFT_JSON`]]: draftJson })
  );
}

export async function submitRefereeForm(
  refCheckId: string,
  refereeNum: 1 | 2 | 3 | 4,
  submission: RefereeSubmission
): Promise<void> {
  const prefix = REFEREE_NUM_PREFIXES[refereeNum - 1];
  const keys = F.ReferenceChecks as Record<string, string>;
  // `directlySupervised` is derived from `reportingRelationship` rather than
  // asked directly (see RefereeSubmission) — kept as its own field so AI
  // insights / the PDF report can keep reading it unchanged.
  const directlySupervised = submission.reportingRelationship === "Reported directly to me";
  await updateRecord(
    TABLE_NAMES.ReferenceChecks,
    refCheckId,
    cleanFields({
      [keys[`${prefix}_RESPONDED`]]: true,
      [keys[`${prefix}_RESPONDED_AT`]]: new Date().toISOString().slice(0, 10),
      [keys[`${prefix}_RELATIONSHIP`]]: submission.relationship,
      [keys[`${prefix}_DIRECTLY_SUPERVISED`]]: directlySupervised,
      [keys[`${prefix}_REPORTING_RELATIONSHIP`]]: submission.reportingRelationship,
      [keys[`${prefix}_ORGANIZATION`]]: submission.refereeOrganization,
      [keys[`${prefix}_PHONE`]]: submission.phone,
      [keys[`${prefix}_DURATION_KNOWN`]]: submission.durationKnown,
      [keys[`${prefix}_INTERACTION_FREQUENCY`]]: submission.interactionFrequency,
      [keys[`${prefix}_JOB_TITLE_RECALLED`]]: submission.jobTitleRecalled,
      [keys[`${prefix}_EMPLOYMENT_FROM`]]: submission.employmentFrom,
      [keys[`${prefix}_EMPLOYMENT_TO`]]: submission.employmentTo,
      [keys[`${prefix}_STILL_EMPLOYED`]]: submission.stillEmployed,
      [keys[`${prefix}_MAIN_RESPONSIBILITIES`]]: submission.mainResponsibilities,
      [keys[`${prefix}_REPORTED_TO`]]: submission.reportedTo,
      [keys[`${prefix}_LEAVING_REASON`]]: submission.leavingReason,
      [keys[`${prefix}_EXECUTION_SCORE`]]: submission.executionScore,
      [keys[`${prefix}_EXECUTION_EXAMPLE`]]: submission.executionExample,
      [keys[`${prefix}_TEAMWORK_SCORE`]]: submission.teamworkScore,
      [keys[`${prefix}_TEAMWORK_EXAMPLE`]]: submission.teamworkExample,
      [keys[`${prefix}_COMMUNICATION_SCORE`]]: submission.communicationScore,
      [keys[`${prefix}_COMMUNICATION_EXAMPLE`]]: submission.communicationExample,
      [keys[`${prefix}_WOULD_REHIRE`]]: submission.wouldRehire,
      [keys[`${prefix}_WOULD_REHIRE_EXPLANATION`]]: submission.wouldRehireExplanation,
      [keys[`${prefix}_TOP_STRENGTHS`]]: submission.topStrengths,
      [keys[`${prefix}_COACHING_AREA`]]: submission.coachingArea,
      [keys[`${prefix}_FEEDBACK_RESPONSE`]]: submission.feedbackResponse,
      [keys[`${prefix}_HONESTY_CONCERNS`]]: submission.honestyConcerns,
      [keys[`${prefix}_COMPLIANCE_INCIDENTS`]]: submission.complianceIncidents,
      [keys[`${prefix}_LICENSE_STANDING`]]: submission.licenseStanding,
      [keys[`${prefix}_PREFER_PHONE_NUMBER`]]: submission.preferPhoneNumber,
      [keys[`${prefix}_RECOMMEND_HIRE`]]: submission.recommendHire,
      [keys[`${prefix}_CONSENT_TO_CONTACT`]]: submission.consentToContact,
      [keys[`${prefix}_NOTES`]]: submission.notes,
      // Submission is complete — the autosave draft (see saveRefereeDraft)
      // is now stale, so clear it rather than leave it stranded.
      [keys[`${prefix}_DRAFT_JSON`]]: null,
    })
  );

  // Recompute the derived status and, at 2 responses, auto-advance the
  // candidate's pipeline stage to Offer. Re-read fresh rather than trusting
  // the pre-update in-memory refCheck, since the write above just changed
  // this referee's `responded` flag — `{ fresh: true }` is required here,
  // not optional: this read happens moments after our own write, well
  // inside the normal 30s cache window, so without it this can (and did, in
  // production — see getRecord's doc comment) read stale pre-write data and
  // silently skip the status transition.
  const fresh = await getRecord(TABLE_NAMES.ReferenceChecks, refCheckId, { fresh: true });
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

    // Permanent PDF backup: generate the same report the dashboard's
    // download/preview uses and attach it to this record, independent of
    // this app. Best-effort — a failure here must never fail the referee's
    // submission, which has already been recorded above.
    await attachReportPdf(refCheckId);
  }
}

async function attachReportPdf(refCheckId: string): Promise<void> {
  try {
    const data = await loadReferenceCheckReportData(refCheckId);
    if (!data) return;
    let aiInsights = data.aiInsights;
    if (!aiInsights) {
      aiInsights = await generateReferenceCheckInsights(data);
      if (aiInsights) {
        await updateRecord(TABLE_NAMES.ReferenceChecks, refCheckId, referenceCheckToAirtable({ aiInsights }));
      }
    }
    const pdfBytes = await generateReferenceCheckReportPdf(data, aiInsights);
    const filename = `Reference Check Report - ${data.candidateName} (${data.refId}).pdf`.replace(/[/\\]/g, "-");

    // uploadAttachment only appends — clear the field first so a later
    // referee's response (3rd/4th, if any) replaces the backup rather than
    // stacking a duplicate alongside it.
    await updateRecord(TABLE_NAMES.ReferenceChecks, refCheckId, cleanFields({ [F.ReferenceChecks.REPORT_PDF]: [] }));
    await uploadAttachment(TABLE_NAMES.ReferenceChecks, refCheckId, F.ReferenceChecks.REPORT_PDF, {
      filename,
      contentType: "application/pdf",
      base64: Buffer.from(pdfBytes).toString("base64"),
    });
  } catch (err) {
    console.error("[referee-form] failed to attach PDF backup:", err);
  }
}
