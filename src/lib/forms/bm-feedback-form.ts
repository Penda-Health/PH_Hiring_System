// Server-only data access for the public, no-login branch-manager feedback
// form (arrival confirmation + work-trial scoring), prefilled from a signed
// token rather than a Supabase session.
import { getRecord, updateRecord } from "@/lib/airtable/client";
import { TABLE_NAMES, F } from "@/lib/airtable/field-names";
import { branchFromAirtable, candidateFromAirtable, openRoleFromAirtable, workTrialFromAirtable } from "@/lib/airtable/mappers";
import { computeWeightedTotal, PASS_THRESHOLD } from "@/lib/work-trial-helpers";

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
};

export async function loadBmFeedbackFormData(workTrialId: string): Promise<BmFeedbackFormData | null> {
  const record = await getRecord(TABLE_NAMES.WorkTrials, workTrialId);
  if (!record) return null;
  const trial = workTrialFromAirtable(record);

  const [candidateRecord, branchRecord] = await Promise.all([
    getRecord(TABLE_NAMES.Candidates, trial.candidateId),
    trial.branchId ? getRecord(TABLE_NAMES.Branches, trial.branchId) : Promise.resolve(null),
  ]);
  const candidate = candidateFromAirtable(candidateRecord);
  const branch = branchRecord ? branchFromAirtable(branchRecord) : null;

  let roleTitle = "";
  if (candidate.roleId) {
    const roleRecord = await getRecord(TABLE_NAMES.OpenRoles, candidate.roleId);
    roleTitle = openRoleFromAirtable(roleRecord).title;
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
  };
}

export async function submitArrival(workTrialId: string, arrived: boolean): Promise<void> {
  await updateRecord(TABLE_NAMES.WorkTrials, workTrialId, {
    [F.WorkTrials.ARRIVAL_MARKED]: arrived ? "Arrived" : "Not Arrived",
  });
}

export async function submitScores(
  workTrialId: string,
  scores: { technical: number; patient: number; culture: number },
  submittedByRole: "BM" | "Incharge"
): Promise<{ total: number; passFail: "Pass" | "Fail" }> {
  const total = computeWeightedTotal(scores);
  const passFail = total >= PASS_THRESHOLD ? "Pass" : "Fail";
  await updateRecord(TABLE_NAMES.WorkTrials, workTrialId, {
    [F.WorkTrials.SCORE_TECHNICAL]: scores.technical,
    [F.WorkTrials.SCORE_PATIENT]: scores.patient,
    [F.WorkTrials.SCORE_SAFETY]: null,
    [F.WorkTrials.SCORE_CULTURE]: scores.culture,
    [F.WorkTrials.TOTAL]: total,
    // If Incharge submits, passFail stays Pending until BM approves
    [F.WorkTrials.PASS_FAIL]: submittedByRole === "BM" ? passFail : "Pending",
    [F.WorkTrials.FORM_SUBMITTED_AT]: new Date().toISOString(),
    [F.WorkTrials.SUBMITTED_BY_ROLE]: submittedByRole,
  });
  return { total, passFail };
}

export async function approveBmScores(workTrialId: string): Promise<{ total: number; passFail: "Pass" | "Fail" }> {
  const record = await getRecord(TABLE_NAMES.WorkTrials, workTrialId);
  if (!record) throw new Error("Work trial not found");
  const trial = workTrialFromAirtable(record);

  const total = trial.total ?? 0;
  const passFail = total >= PASS_THRESHOLD ? "Pass" : "Fail";
  await updateRecord(TABLE_NAMES.WorkTrials, workTrialId, {
    [F.WorkTrials.PASS_FAIL]: passFail,
    [F.WorkTrials.BM_APPROVED_AT]: new Date().toISOString(),
  });
  return { total, passFail };
}
