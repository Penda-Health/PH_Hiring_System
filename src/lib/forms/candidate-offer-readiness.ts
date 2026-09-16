// Shared by submitRefereeForm (referee-form.ts) and the BM feedback scoring
// functions (bm-feedback-form.ts) — Reference Checks and Work Trials are
// deliberately allowed to finish in either order, or in parallel, so a
// candidate should only auto-advance from "Reference Check" to "Offer" once
// BOTH have finished favorably: at least 2 referees responded (reflected as
// the reference check's own "Ready for Offer" status) AND a Work Trial for
// them has actually passed. Whichever of the two happens to finish second is
// the one that triggers the advance — both call tryAdvanceToOffer, which
// re-checks the other side itself and silently no-ops if it isn't ready yet.
import { getRecord, listRecords, updateRecord, cleanFields } from "@/lib/airtable/client";
import { TABLE_NAMES, F } from "@/lib/airtable/field-names";
import { candidateFromAirtable, referenceCheckFromAirtable, workTrialFromAirtable } from "@/lib/airtable/mappers";

// Full-table scan rather than a filterByFormula lookup, same reasoning as
// reference-check-request-form.ts's alreadySubmitted check: Airtable's
// linked-record formulas match on the linked table's primary field, which
// is more fragile than comparing the resolved candidateId in JS once
// records are back, and neither table is large enough for the scan to
// matter. A candidate can have more than one Work Trial record (e.g. a
// retry after an earlier fail) — any one of them passing is enough.
export async function candidateHasPassedWorkTrial(candidateId: string): Promise<boolean> {
  const allTrials = await listRecords(TABLE_NAMES.WorkTrials);
  return allTrials.map(workTrialFromAirtable).some((t) => t.candidateId === candidateId && t.passFail === "Pass");
}

export async function findReferenceCheckForCandidate(candidateId: string) {
  const allChecks = await listRecords(TABLE_NAMES.ReferenceChecks);
  return allChecks.map(referenceCheckFromAirtable).find((rc) => rc.candidateId === candidateId) ?? null;
}

/**
 * Advances a candidate from "Reference Check" to "Offer" once both gates are
 * satisfied. Safe to call speculatively from either side (a referee just
 * submitted, or a work trial was just scored) — it independently re-checks
 * both conditions and does nothing if either isn't met yet. Also guarded
 * against overwriting a stage a recruiter already changed by hand.
 */
export async function tryAdvanceToOffer(candidateId: string): Promise<void> {
  const candidateRecord = await getRecord(TABLE_NAMES.Candidates, candidateId);
  if (!candidateRecord) return;
  const candidate = candidateFromAirtable(candidateRecord);
  if (candidate.stage !== "Reference Check") return;

  const refCheck = await findReferenceCheckForCandidate(candidateId);
  if (!refCheck || refCheck.status !== "Ready for Offer") return;

  if (!(await candidateHasPassedWorkTrial(candidateId))) return;

  await updateRecord(TABLE_NAMES.Candidates, candidateId, cleanFields({ [F.Candidates.STAGE]: "Offer" }));
}
