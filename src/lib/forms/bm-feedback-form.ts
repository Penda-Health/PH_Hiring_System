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
  trialDate: string;
  arrivalMarked: boolean | null;
  alreadyScored: boolean;
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

  return {
    candidateName: candidate.name,
    roleTitle,
    branchName: branch?.name ?? "",
    trialDate: trial.date,
    arrivalMarked: trial.arrivalMarked,
    alreadyScored: Boolean(trial.formSubmittedAt) && trial.total !== null,
  };
}

export async function submitArrival(workTrialId: string, arrived: boolean): Promise<void> {
  await updateRecord(TABLE_NAMES.WorkTrials, workTrialId, {
    [F.WorkTrials.ARRIVAL_MARKED]: arrived ? "Arrived" : "Not Arrived",
  });
}

export async function submitScores(
  workTrialId: string,
  scores: { technical: number; patient: number; safety: number; culture: number }
): Promise<{ total: number; passFail: "Pass" | "Fail" }> {
  const total = computeWeightedTotal(scores);
  const passFail = total >= PASS_THRESHOLD ? "Pass" : "Fail";
  await updateRecord(TABLE_NAMES.WorkTrials, workTrialId, {
    [F.WorkTrials.SCORE_TECHNICAL]: scores.technical,
    [F.WorkTrials.SCORE_PATIENT]: scores.patient,
    [F.WorkTrials.SCORE_SAFETY]: scores.safety,
    [F.WorkTrials.SCORE_CULTURE]: scores.culture,
    [F.WorkTrials.TOTAL]: total,
    [F.WorkTrials.PASS_FAIL]: passFail,
    [F.WorkTrials.FORM_SUBMITTED_AT]: new Date().toISOString(),
  });
  return { total, passFail };
}
