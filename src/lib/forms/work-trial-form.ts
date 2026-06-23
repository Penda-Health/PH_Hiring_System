// Server-only data access for the public, no-login work-trial branch
// selection form. Separate from src/app/api/work-trials/* (which is for the
// authenticated staff UI) because this reads/writes a single record looked
// up by an unauthenticated, token-verified candidate rather than a logged-in
// staff member.
import { getRecord, listRecords, updateRecord, link } from "@/lib/airtable/client";
import { TABLE_NAMES, F } from "@/lib/airtable/field-names";
import { branchFromAirtable, candidateFromAirtable, openRoleFromAirtable } from "@/lib/airtable/mappers";
import { workTrialFromAirtable } from "@/lib/airtable/mappers";

export type WorkTrialFormData = {
  candidateName: string;
  roleTitle: string;
  alreadySubmitted: boolean;
  selectedBranchName?: string;
  selectedDate?: string;
  branches: { id: string; name: string; city: string; branchManager: string }[];
};

export async function loadWorkTrialFormData(workTrialId: string): Promise<WorkTrialFormData | null> {
  const record = await getRecord(TABLE_NAMES.WorkTrials, workTrialId);
  if (!record) return null;
  const trial = workTrialFromAirtable(record);

  const [candidateRecord, branchRecords] = await Promise.all([
    getRecord(TABLE_NAMES.Candidates, trial.candidateId),
    listRecords(TABLE_NAMES.Branches),
  ]);
  const candidate = candidateFromAirtable(candidateRecord);

  let roleTitle = "";
  if (candidate.roleId) {
    const roleRecord = await getRecord(TABLE_NAMES.OpenRoles, candidate.roleId);
    roleTitle = openRoleFromAirtable(roleRecord).title;
  }

  const branches = branchRecords
    .map(branchFromAirtable)
    .filter((b) => b.active)
    .map((b) => ({ id: b.id, name: b.name, city: b.city, branchManager: b.branchManager }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const alreadySubmitted = Boolean(trial.formSubmittedAt) && Boolean(trial.branchId) && Boolean(trial.date);
  const selectedBranch = trial.branchId ? branches.find((b) => b.id === trial.branchId) : undefined;

  return {
    candidateName: candidate.name,
    roleTitle,
    alreadySubmitted,
    selectedBranchName: selectedBranch?.name,
    selectedDate: trial.date || undefined,
    branches,
  };
}

export async function submitWorkTrialSelection(
  workTrialId: string,
  selection: { branchId: string; date: string; notes?: string }
): Promise<void> {
  await updateRecord(TABLE_NAMES.WorkTrials, workTrialId, {
    [F.WorkTrials.BRANCH]: link(selection.branchId),
    [F.WorkTrials.DATE]: selection.date,
    [F.WorkTrials.FORM_SUBMITTED_AT]: new Date().toISOString(),
  });
}
