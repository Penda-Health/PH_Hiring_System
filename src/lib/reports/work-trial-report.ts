// Data access for the individual work-trial PDF report (dashboard-only,
// authenticated). Reuses the same Airtable reads as the BM feedback form
// rather than loadBmFeedbackFormData directly, because the report also needs
// a couple of fields that form doesn't: wtId, uploadedFormFiles, and the
// branch's official Branch Manager (as distinct from `supervisor`, which is
// whoever was recorded as overseeing this specific trial).
import { getRecord } from "@/lib/airtable/client";
import { TABLE_NAMES } from "@/lib/airtable/field-names";
import { branchFromAirtable, candidateFromAirtable, openRoleFromAirtable, workTrialFromAirtable } from "@/lib/airtable/mappers";

export type WorkTrialReportData = {
  wtId: string;
  candidateName: string;
  roleTitle: string;
  specialty?: string;
  branchName: string;
  branchManager: string;
  supervisor: string;
  trialDate: string;
  formSubmittedAt: string | null;
  submittedByRole: "BM" | "Incharge" | null;
  bmApprovedAt: string | null;
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
  // Presence of files is what distinguishes the two report layouts — see
  // generateWorkTrialReportPdf. There's no reliable "Submission Method"
  // field in Airtable yet (see bm-feedback-form.ts's submitUploadedScores),
  // so "was a form uploaded" is derived from whether a file exists.
  uploadedFormFiles?: { url: string; filename: string }[];
};

export async function loadWorkTrialReportData(workTrialId: string): Promise<WorkTrialReportData | null> {
  const record = await getRecord(TABLE_NAMES.WorkTrials, workTrialId);
  if (!record) return null;
  const trial = workTrialFromAirtable(record);

  const [candidateRecord, branchRecord] = await Promise.all([
    getRecord(TABLE_NAMES.Candidates, trial.candidateId),
    trial.branchId ? getRecord(TABLE_NAMES.Branches, trial.branchId) : Promise.resolve(null),
  ]);
  if (!candidateRecord) throw new Error(`Candidate ${trial.candidateId} not found for work trial ${workTrialId}`);
  const candidate = candidateFromAirtable(candidateRecord);
  const branch = branchRecord ? branchFromAirtable(branchRecord) : null;

  let roleTitle = "";
  if (candidate.roleId) {
    const roleRecord = await getRecord(TABLE_NAMES.OpenRoles, candidate.roleId);
    roleTitle = roleRecord ? openRoleFromAirtable(roleRecord).title : "";
  }
  if (!roleTitle) roleTitle = trial.specialty ?? trial.roleCategory ?? "";

  return {
    wtId: trial.wtId,
    candidateName: candidate.name,
    roleTitle,
    specialty: trial.specialty,
    branchName: branch?.name ?? "",
    branchManager: branch?.branchManager ?? "",
    supervisor: trial.supervisor,
    trialDate: trial.date,
    formSubmittedAt: trial.formSubmittedAt,
    submittedByRole: trial.submittedByRole,
    bmApprovedAt: trial.bmApprovedAt,
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
    uploadedFormFiles: trial.uploadedFormFiles,
  };
}
