// Server-only data access for the public, no-login branch-manager feedback
// form (arrival confirmation + work-trial scoring), prefilled from a signed
// token rather than a Supabase session.
import { getRecord, updateRecord, uploadAttachment } from "@/lib/airtable/client";
import { TABLE_NAMES, F } from "@/lib/airtable/field-names";
import { branchFromAirtable, candidateFromAirtable, openRoleFromAirtable, workTrialFromAirtable } from "@/lib/airtable/mappers";
import { computeWeightedTotal, computePassFail, PASS_THRESHOLD, isCultureAutoFail, isTechnicalAutoFail } from "@/lib/work-trial-helpers";

export type BmFeedbackFormData = {
  candidateName: string;
  roleTitle: string;
  branchName: string;
  supervisor: string;
  trialDate: string;
  arrivalMarked: boolean | null;
  alreadyScored: boolean;
  submittedByRole: "BM" | "Incharge" | null;
  bmApprovedAt: string | null;
  pendingApproval: boolean;
  scoreTechnical: number | null;
  scorePatient: number | null;
  scoreCulture: number | null;
  total: number | null;
  passFail: "Pass" | "Fail" | "Pending";
  commentCulture?: string;
  commentPatient?: string;
  commentTechnical?: string;
  strengths?: string;
  areasOfDevelopment?: string;
  overallRecommendation?: string;
};

export async function loadBmFeedbackFormData(workTrialId: string): Promise<BmFeedbackFormData | null> {
  const record = await getRecord(TABLE_NAMES.WorkTrials, workTrialId);
  if (!record) return null;
  const trial = workTrialFromAirtable(record);

  const [candidateRecord, branchRecord] = await Promise.all([
    getRecord(TABLE_NAMES.Candidates, trial.candidateId),
    trial.branchId ? getRecord(TABLE_NAMES.Branches, trial.branchId) : Promise.resolve(null),
  ]);
  // A work trial's linked candidate should always exist — if it 404s, the
  // data itself is broken, which is a real server error, not a routine
  // not-found the caller should treat as "form not found".
  if (!candidateRecord) throw new Error(`Candidate ${trial.candidateId} not found for work trial ${workTrialId}`);
  const candidate = candidateFromAirtable(candidateRecord);
  const branch = branchRecord ? branchFromAirtable(branchRecord) : null;

  let roleTitle = "";
  if (candidate.roleId) {
    const roleRecord = await getRecord(TABLE_NAMES.OpenRoles, candidate.roleId);
    roleTitle = roleRecord ? openRoleFromAirtable(roleRecord).title : "";
  }

  const pendingApproval =
    Boolean(trial.formSubmittedAt) &&
    trial.submittedByRole === "Incharge" &&
    !trial.bmApprovedAt;

  return {
    candidateName: candidate.name,
    roleTitle,
    branchName: branch?.name ?? "",
    supervisor: trial.supervisor,
    trialDate: trial.date,
    arrivalMarked: trial.arrivalMarked,
    alreadyScored: Boolean(trial.formSubmittedAt) && trial.total !== null && !pendingApproval,
    submittedByRole: trial.submittedByRole,
    bmApprovedAt: trial.bmApprovedAt,
    pendingApproval,
    scoreTechnical: trial.scoreTechnical,
    scorePatient: trial.scorePatient,
    scoreCulture: trial.scoreCulture,
    total: trial.total,
    passFail: trial.passFail,
    commentCulture: trial.commentCulture,
    commentPatient: trial.commentPatient,
    commentTechnical: trial.commentTechnical,
    strengths: trial.strengths,
    areasOfDevelopment: trial.areasOfDevelopment,
    overallRecommendation: trial.overallRecommendation,
  };
}

export async function submitArrival(workTrialId: string, arrived: boolean): Promise<void> {
  await updateRecord(TABLE_NAMES.WorkTrials, workTrialId, {
    [F.WorkTrials.ARRIVAL_MARKED]: arrived ? "Arrived" : "Not Arrived",
  });
}

export type ScoreComments = {
  commentCulture?: string;
  commentPatient?: string;
  commentTechnical?: string;
  strengths?: string;
  areasOfDevelopment?: string;
  overallRecommendation?: string;
};

export async function submitScores(
  workTrialId: string,
  scores: { technical: number; patient: number; culture: number },
  submittedByRole: "BM" | "Incharge",
  comments?: ScoreComments
): Promise<{ total: number; passFail: "Pass" | "Fail" }> {
  const total = computeWeightedTotal(scores);
  const passFail = computePassFail(scores);
  await updateRecord(TABLE_NAMES.WorkTrials, workTrialId, {
    [F.WorkTrials.SCORE_TECHNICAL]: scores.technical,
    [F.WorkTrials.SCORE_PATIENT]: scores.patient,
    // Score Safety is intentionally omitted — the current form only collects
    // Culture, Patient, and Technical scores. Sending null for a field that
    // may not exist in the base causes an Airtable API error.
    [F.WorkTrials.SCORE_CULTURE]: scores.culture,
    [F.WorkTrials.TOTAL]: total,
    // If Incharge submits, passFail stays Pending until BM approves
    [F.WorkTrials.PASS_FAIL]: submittedByRole === "BM" ? passFail : "Pending",
    [F.WorkTrials.FORM_SUBMITTED_AT]: new Date().toISOString(),
    [F.WorkTrials.SUBMITTED_BY_ROLE]: submittedByRole,
    [F.WorkTrials.SUBMISSION_METHOD]: "Online",
    ...(comments?.commentCulture    ? { [F.WorkTrials.COMMENT_CULTURE]:       comments.commentCulture    } : {}),
    ...(comments?.commentPatient    ? { [F.WorkTrials.COMMENT_PATIENT]:       comments.commentPatient    } : {}),
    ...(comments?.commentTechnical  ? { [F.WorkTrials.COMMENT_TECHNICAL]:     comments.commentTechnical  } : {}),
    ...(comments?.strengths         ? { [F.WorkTrials.STRENGTHS]:             comments.strengths         } : {}),
    ...(comments?.areasOfDevelopment? { [F.WorkTrials.AREAS_OF_DEVELOPMENT]:  comments.areasOfDevelopment} : {}),
    ...(comments?.overallRecommendation ? { [F.WorkTrials.OVERALL_RECOMMENDATION]: comments.overallRecommendation } : {}),
  });
  return { total, passFail };
}

// The "upload a completed form" path: numeric scores are still entered and
// scored with the exact same weighted-total/auto-fail rules as submitScores
// above, but the six detailed 250-char fields are skipped in favor of one
// shorter overallRecommendation, and the uploaded file itself is attached to
// the record. Deliberately reuses computeWeightedTotal/computePassFail
// rather than reimplementing them, so "uploaded" and "online" work trials
// are scored identically and stay comparable.
export async function submitUploadedScores(
  workTrialId: string,
  scores: { technical: number; patient: number; culture: number },
  submittedByRole: "BM" | "Incharge",
  overallRecommendation: string,
  file: { filename: string; contentType: string; base64: string }
): Promise<{ total: number; passFail: "Pass" | "Fail" }> {
  const total = computeWeightedTotal(scores);
  const passFail = computePassFail(scores);
  await updateRecord(TABLE_NAMES.WorkTrials, workTrialId, {
    [F.WorkTrials.SCORE_TECHNICAL]: scores.technical,
    [F.WorkTrials.SCORE_PATIENT]: scores.patient,
    // Score Safety intentionally omitted — see submitScores comment above.
    [F.WorkTrials.SCORE_CULTURE]: scores.culture,
    [F.WorkTrials.TOTAL]: total,
    // If Incharge submits, passFail stays Pending until BM approves — same
    // rule as the online path.
    [F.WorkTrials.PASS_FAIL]: submittedByRole === "BM" ? passFail : "Pending",
    [F.WorkTrials.FORM_SUBMITTED_AT]: new Date().toISOString(),
    [F.WorkTrials.SUBMITTED_BY_ROLE]: submittedByRole,
    [F.WorkTrials.SUBMISSION_METHOD]: "Uploaded",
    [F.WorkTrials.OVERALL_RECOMMENDATION]: overallRecommendation,
  });
  // Separate API call (different Airtable host/endpoint) — do this after the
  // field update succeeds so a failed upload doesn't leave scores half-saved
  // without at least the numbers being recorded.
  await uploadAttachment(TABLE_NAMES.WorkTrials, workTrialId, F.WorkTrials.UPLOADED_FORM, file);
  return { total, passFail };
}

export async function approveBmScores(workTrialId: string): Promise<{ total: number; passFail: "Pass" | "Fail" }> {
  const record = await getRecord(TABLE_NAMES.WorkTrials, workTrialId);
  if (!record) throw new Error("Work trial not found");
  const trial = workTrialFromAirtable(record);

  const total = trial.total ?? 0;
  const cultureScore = trial.scoreCulture ?? 0;
  const technicalScore = trial.scoreTechnical ?? 0;
  const passFail =
    isCultureAutoFail(cultureScore) || isTechnicalAutoFail(technicalScore) || total < PASS_THRESHOLD
      ? "Fail"
      : "Pass";
  await updateRecord(TABLE_NAMES.WorkTrials, workTrialId, {
    [F.WorkTrials.PASS_FAIL]: passFail,
    [F.WorkTrials.BM_APPROVED_AT]: new Date().toISOString(),
  });
  return { total, passFail };
}
