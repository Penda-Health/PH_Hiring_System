// Converts between Airtable records (table name + flat/linked fields) and
// the app's types.ts shapes. `id` throughout the app is always the Airtable
// record ID once data is sourced from Airtable — there is no separate
// internal ID scheme to reconcile.
import {
  Branch,
  Requisition,
  OpenRole,
  Candidate,
  Interview,
  WorkTrial,
  WorkTrialAiInsights,
  ReferenceCheck,
  RefereeStatus,
  ReferenceCheckAiInsights,
  Offer,
  NewEmployee,
  Reliever,
  Locum,
  SpecialtyConfig,
  WorkTrialDay,
  WorkTrialRoleCategory,
  StaffingProjection,
  AppSettings,
} from "@/types";
import { AirtableRecord, allLinks, cleanFields, firstLink, link, links } from "./client";
import { F } from "./field-names";

function str(v: unknown): string {
  return typeof v === "string" ? v : v == null ? "" : String(v);
}
function num(v: unknown): number {
  return typeof v === "number" ? v : 0;
}
function bool(v: unknown): boolean {
  return v === true;
}
function opt<T>(v: unknown): T | undefined {
  return v === undefined || v === null || v === "" ? undefined : (v as T);
}
// Airtable attachment fields come back as an array of
// { id, url, filename, size, type, thumbnails? } objects. We only need
// enough to link to/display the file, not the full Airtable shape.
function attachmentsFromAirtable(v: unknown): { url: string; filename: string }[] | undefined {
  if (!Array.isArray(v) || v.length === 0) return undefined;
  return v
    .filter((a): a is { url?: unknown; filename?: unknown } => typeof a === "object" && a !== null)
    .map((a) => ({ url: str(a.url), filename: str(a.filename) }))
    .filter((a) => a.url);
}

// ---------- Branches ----------
export function branchFromAirtable(r: AirtableRecord): Branch {
  const f = r.fields;
  return {
    id: r.id,
    branchId: str(f[F.Branches.BRANCH_ID]),
    name: str(f[F.Branches.NAME]),
    city: str(f[F.Branches.CITY]),
    region: str(f[F.Branches.REGION]),
    branchManager: str(f[F.Branches.BRANCH_MANAGER]),
    bmEmail: str(f[F.Branches.BM_EMAIL]),
    bmPhone: str(f[F.Branches.BM_PHONE]),
    regionalManager: str(f[F.Branches.REGIONAL_MANAGER]),
    capacity: num(f[F.Branches.CAPACITY]),
    active: bool(f[F.Branches.ACTIVE]),
    workTrialActive: bool(f[F.Branches.WORK_TRIAL_ACTIVE]),
    address: str(f[F.Branches.ADDRESS]),
    mapPinUrl: str(f[F.Branches.MAP_PIN_URL]),
    expansionBranch: f[F.Branches.EXPANSION_BRANCH] === true,
    // Older records predate this field — treat unset as an IPS clinic branch,
    // the vast majority case, until the base is backfilled.
    segment: (f[F.Branches.SEGMENT] as Branch["segment"]) || "IPS",
  };
}
export function branchToAirtable(b: Partial<Branch>) {
  return cleanFields({
    [F.Branches.BRANCH_ID]: b.branchId,
    [F.Branches.NAME]: b.name,
    [F.Branches.CITY]: b.city,
    [F.Branches.REGION]: b.region,
    [F.Branches.BRANCH_MANAGER]: b.branchManager,
    [F.Branches.BM_EMAIL]: b.bmEmail,
    [F.Branches.BM_PHONE]: b.bmPhone,
    [F.Branches.REGIONAL_MANAGER]: b.regionalManager,
    [F.Branches.CAPACITY]: b.capacity,
    [F.Branches.ACTIVE]: b.active,
    // Was missing here even though it's read in branchFromAirtable above —
    // workTrialActive could never actually be written back via the API.
    [F.Branches.WORK_TRIAL_ACTIVE]: b.workTrialActive,
    [F.Branches.ADDRESS]: b.address,
    [F.Branches.MAP_PIN_URL]: b.mapPinUrl,
    [F.Branches.EXPANSION_BRANCH]: b.expansionBranch,
    [F.Branches.SEGMENT]: b.segment,
  });
}

// ---------- Requisitions ----------
export function requisitionFromAirtable(r: AirtableRecord): Requisition {
  const f = r.fields;
  return {
    id: r.id,
    reqId: str(f[F.Requisitions.REQ_ID]),
    type: f[F.Requisitions.TYPE] as Requisition["type"],
    roleTitle: str(f[F.Requisitions.ROLE_TITLE]),
    department: str(f[F.Requisitions.DEPARTMENT]),
    segment: f[F.Requisitions.SEGMENT] as Requisition["segment"],
    gapReason: opt(f[F.Requisitions.GAP_REASON]),
    reasonType: opt(f[F.Requisitions.REASON_TYPE]),
    branchId: firstLink(f[F.Requisitions.BRANCH]),
    employmentType: opt(f[F.Requisitions.EMPLOYMENT_TYPE]),
    level: opt(f[F.Requisitions.LEVEL]),
    headcount: num(f[F.Requisitions.HEADCOUNT]),
    justification: str(f[F.Requisitions.JUSTIFICATION]),
    salaryRangeMin: opt(f[F.Requisitions.SALARY_MIN]),
    salaryRangeMax: opt(f[F.Requisitions.SALARY_MAX]),
    urgency: f[F.Requisitions.URGENCY] as Requisition["urgency"],
    jdAttached: bool(f[F.Requisitions.JD_ATTACHED]),
    jdUrl: opt(f[F.Requisitions.JD_URL]),
    status: f[F.Requisitions.STATUS] as Requisition["status"],
    approverChain: str(f[F.Requisitions.APPROVER_CHAIN]).split("\n").filter(Boolean),
    currentApproverIndex: num(f[F.Requisitions.CURRENT_APPROVER_INDEX]),
    submittedBy: str(f[F.Requisitions.SUBMITTED_BY]),
    submittedAt: str(f[F.Requisitions.SUBMITTED_AT]),
    expectedStartDate: opt(f[F.Requisitions.EXPECTED_START_DATE]),
    context: opt(f[F.Requisitions.CONTEXT]),
    submitterName: opt(f[F.Requisitions.SUBMITTER_NAME]),
    submitterEmail: opt(f[F.Requisitions.SUBMITTER_EMAIL]),
    submitterRole: opt(f[F.Requisitions.SUBMITTER_ROLE]),
    source: opt(f[F.Requisitions.SOURCE]),
    budgetEvaluationConfirmed: bool(f[F.Requisitions.BUDGET_EVALUATION_CONFIRMED]),
  };
}
export function requisitionToAirtable(r: Partial<Requisition>) {
  return cleanFields({
    [F.Requisitions.REQ_ID]: r.reqId,
    [F.Requisitions.TYPE]: r.type,
    [F.Requisitions.ROLE_TITLE]: r.roleTitle,
    [F.Requisitions.DEPARTMENT]: r.department,
    [F.Requisitions.SEGMENT]: r.segment,
    [F.Requisitions.GAP_REASON]: r.gapReason,
    [F.Requisitions.REASON_TYPE]: r.reasonType,
    [F.Requisitions.BRANCH]: r.branchId !== undefined ? link(r.branchId) : undefined,
    [F.Requisitions.EMPLOYMENT_TYPE]: r.employmentType,
    [F.Requisitions.LEVEL]: r.level,
    [F.Requisitions.HEADCOUNT]: r.headcount,
    [F.Requisitions.JUSTIFICATION]: r.justification,
    [F.Requisitions.SALARY_MIN]: r.salaryRangeMin,
    [F.Requisitions.SALARY_MAX]: r.salaryRangeMax,
    [F.Requisitions.URGENCY]: r.urgency,
    [F.Requisitions.JD_ATTACHED]: r.jdAttached,
    [F.Requisitions.JD_URL]: r.jdUrl,
    [F.Requisitions.STATUS]: r.status,
    [F.Requisitions.APPROVER_CHAIN]: r.approverChain?.join("\n"),
    [F.Requisitions.CURRENT_APPROVER_INDEX]: r.currentApproverIndex,
    [F.Requisitions.SUBMITTED_BY]: r.submittedBy,
    [F.Requisitions.SUBMITTED_AT]: r.submittedAt,
    [F.Requisitions.EXPECTED_START_DATE]: r.expectedStartDate,
    [F.Requisitions.CONTEXT]: r.context,
    [F.Requisitions.SUBMITTER_NAME]: r.submitterName,
    [F.Requisitions.SUBMITTER_EMAIL]: r.submitterEmail,
    [F.Requisitions.SUBMITTER_ROLE]: r.submitterRole,
    [F.Requisitions.SOURCE]: r.source,
    [F.Requisitions.BUDGET_EVALUATION_CONFIRMED]: r.budgetEvaluationConfirmed,
  });
}

// ---------- Open Roles ----------
export function openRoleFromAirtable(r: AirtableRecord): OpenRole {
  const f = r.fields;
  return {
    id: r.id,
    roleId: str(f[F.OpenRoles.ROLE_ID]),
    title: str(f[F.OpenRoles.TITLE]),
    segment: f[F.OpenRoles.SEGMENT] as OpenRole["segment"],
    department: str(f[F.OpenRoles.DEPARTMENT]),
    location: str(f[F.OpenRoles.LOCATION]),
    branchId: firstLink(f[F.OpenRoles.BRANCH]),
    branchIds: allLinks(f[F.OpenRoles.BRANCH]),
    priority: f[F.OpenRoles.PRIORITY] as OpenRole["priority"],
    status: f[F.OpenRoles.STATUS] as OpenRole["status"],
    hcApproved: num(f[F.OpenRoles.HC_APPROVED]),
    hcFilled: num(f[F.OpenRoles.HC_FILLED]),
    recruiter: str(f[F.OpenRoles.RECRUITER]),
    hiringManager: str(f[F.OpenRoles.HIRING_MANAGER]),
    hiringManagerEmail: opt(f[F.OpenRoles.HIRING_MANAGER_EMAIL]),
    datePosted: str(f[F.OpenRoles.DATE_POSTED]),
    dateClosed: opt(f[F.OpenRoles.DATE_CLOSED]),
    employmentType: opt(f[F.OpenRoles.EMPLOYMENT_TYPE]) as OpenRole["employmentType"],
    notes: opt(f[F.OpenRoles.NOTES]),
    internalFill: f[F.OpenRoles.INTERNAL_FILL] === true,
    internalFillName: opt(f[F.OpenRoles.INTERNAL_FILL_NAME]),
    replacementRequisitionId: firstLink(f[F.OpenRoles.REPLACEMENT_REQUISITION]),
    requisitionId: firstLink(f[F.OpenRoles.REQUISITION]),
    requisitionSubmitterName: opt(f[F.OpenRoles.REQ_SUBMITTER_NAME]),
    requisitionSubmitterEmail: opt(f[F.OpenRoles.REQ_SUBMITTER_EMAIL]),
    cadre: opt(f[F.OpenRoles.CADRE]),
  };
}
export function openRoleToAirtable(r: Partial<OpenRole>) {
  return cleanFields({
    [F.OpenRoles.ROLE_ID]: r.roleId,
    [F.OpenRoles.TITLE]: r.title,
    [F.OpenRoles.SEGMENT]: r.segment,
    [F.OpenRoles.DEPARTMENT]: r.department,
    [F.OpenRoles.LOCATION]: r.location,
    // branchIds (the full multi-branch link list) wins when present — a
    // group role writes its whole branch set through this path. Falls back
    // to the single-branch link() write for every existing call site that
    // only ever set branchId.
    [F.OpenRoles.BRANCH]: r.branchIds !== undefined ? links(r.branchIds) : r.branchId !== undefined ? link(r.branchId) : undefined,
    [F.OpenRoles.PRIORITY]: r.priority,
    [F.OpenRoles.STATUS]: r.status,
    [F.OpenRoles.HC_APPROVED]: r.hcApproved,
    [F.OpenRoles.HC_FILLED]: r.hcFilled,
    [F.OpenRoles.RECRUITER]: r.recruiter,
    [F.OpenRoles.HIRING_MANAGER]: r.hiringManager,
    [F.OpenRoles.HIRING_MANAGER_EMAIL]: r.hiringManagerEmail,
    [F.OpenRoles.DATE_POSTED]: r.datePosted,
    [F.OpenRoles.DATE_CLOSED]: r.dateClosed,
    [F.OpenRoles.EMPLOYMENT_TYPE]: r.employmentType,
    [F.OpenRoles.NOTES]: r.notes,
    [F.OpenRoles.INTERNAL_FILL]: r.internalFill,
    [F.OpenRoles.INTERNAL_FILL_NAME]: r.internalFillName,
    [F.OpenRoles.REPLACEMENT_REQUISITION]:
      r.replacementRequisitionId !== undefined ? link(r.replacementRequisitionId) : undefined,
    [F.OpenRoles.REQUISITION]: r.requisitionId !== undefined ? link(r.requisitionId) : undefined,
    [F.OpenRoles.REQ_SUBMITTER_NAME]: r.requisitionSubmitterName,
    [F.OpenRoles.REQ_SUBMITTER_EMAIL]: r.requisitionSubmitterEmail,
    [F.OpenRoles.CADRE]: r.cadre,
  });
}

// ---------- Candidates ----------
export function candidateFromAirtable(r: AirtableRecord): Candidate {
  const f = r.fields;
  const referee1Name = opt<string>(f[F.Candidates.REFEREE1_NAME]);
  const referee2Name = opt<string>(f[F.Candidates.REFEREE2_NAME]);
  return {
    id: r.id,
    candId: str(f[F.Candidates.CAND_ID]),
    name: str(f[F.Candidates.NAME]),
    phone: str(f[F.Candidates.PHONE]),
    email: str(f[F.Candidates.EMAIL]),
    roleId: firstLink(f[F.Candidates.ROLE]) || undefined,
    segment: opt<Candidate["segment"]>(f[F.Candidates.SEGMENT]),
    department: opt<string>(f[F.Candidates.DEPARTMENT]),
    stage: f[F.Candidates.STAGE] as Candidate["stage"],
    source: str(f[F.Candidates.SOURCE]),
    gender: (f[F.Candidates.GENDER] as Candidate["gender"]) ?? undefined,
    employmentType: f[F.Candidates.EMPLOYMENT_TYPE] as Candidate["employmentType"],
    referee1: referee1Name
      ? {
          name: referee1Name,
          email: str(f[F.Candidates.REFEREE1_EMAIL]),
          phone: str(f[F.Candidates.REFEREE1_PHONE]),
        }
      : undefined,
    referee2: referee2Name
      ? {
          name: referee2Name,
          email: str(f[F.Candidates.REFEREE2_EMAIL]),
          phone: str(f[F.Candidates.REFEREE2_PHONE]),
        }
      : undefined,
    workTrialStatus: opt(f[F.Candidates.WORK_TRIAL_STATUS]),
    refCheckStatus: opt(f[F.Candidates.REF_CHECK_STATUS]),
    offerStatus: opt(f[F.Candidates.OFFER_STATUS]),
    joined: opt(f[F.Candidates.JOINED]),
    stageEnteredAt: str(f[F.Candidates.STAGE_ENTERED_AT]),
    createdAt: str(f[F.Candidates.CREATED_AT]),
  };
}
export function candidateToAirtable(c: Partial<Candidate>) {
  return cleanFields({
    [F.Candidates.CAND_ID]: c.candId,
    [F.Candidates.NAME]: c.name,
    [F.Candidates.PHONE]: c.phone,
    [F.Candidates.EMAIL]: c.email,
    [F.Candidates.ROLE]: c.roleId ? link(c.roleId) : undefined,
    [F.Candidates.SEGMENT]: c.segment,
    [F.Candidates.DEPARTMENT]: c.department,
    [F.Candidates.STAGE]: c.stage,
    [F.Candidates.SOURCE]: c.source,
    [F.Candidates.GENDER]: c.gender,
    [F.Candidates.EMPLOYMENT_TYPE]: c.employmentType,
    [F.Candidates.REFEREE1_NAME]: c.referee1?.name,
    [F.Candidates.REFEREE1_EMAIL]: c.referee1?.email,
    [F.Candidates.REFEREE1_PHONE]: c.referee1?.phone,
    [F.Candidates.REFEREE2_NAME]: c.referee2?.name,
    [F.Candidates.REFEREE2_EMAIL]: c.referee2?.email,
    [F.Candidates.REFEREE2_PHONE]: c.referee2?.phone,
    [F.Candidates.WORK_TRIAL_STATUS]: c.workTrialStatus,
    [F.Candidates.REF_CHECK_STATUS]: c.refCheckStatus,
    [F.Candidates.OFFER_STATUS]: c.offerStatus,
    [F.Candidates.JOINED]: c.joined,
    // Candidates table uses date-only fields — strip the time component before
    // writing so Airtable doesn't reject a full ISO datetime string.
    [F.Candidates.STAGE_ENTERED_AT]: c.stageEnteredAt ? c.stageEnteredAt.slice(0, 10) : undefined,
    [F.Candidates.CREATED_AT]: c.createdAt ? c.createdAt.slice(0, 10) : undefined,
  });
}

// ---------- Interviews ----------
export function interviewFromAirtable(r: AirtableRecord): Interview {
  const f = r.fields;
  return {
    id: r.id,
    schedId: str(f[F.Interviews.SCHED_ID]),
    candidateId: firstLink(f[F.Interviews.CANDIDATE]) ?? "",
    roleId: firstLink(f[F.Interviews.ROLE]) ?? "",
    date: str(f[F.Interviews.DATE]),
    time: str(f[F.Interviews.TIME]),
    weekLabel: str(f[F.Interviews.WEEK_LABEL]),
    month: str(f[F.Interviews.MONTH]),
    stage: f[F.Interviews.STAGE] as Interview["stage"],
    type: f[F.Interviews.TYPE] as Interview["type"],
    location: str(f[F.Interviews.LOCATION]),
    interviewers: str(f[F.Interviews.INTERVIEWERS]).split("\n").filter(Boolean),
    confirmed: bool(f[F.Interviews.CONFIRMED]),
    reminderSent: bool(f[F.Interviews.REMINDER_SENT]),
    attendance: f[F.Interviews.ATTENDANCE] as Interview["attendance"],
    outcome: f[F.Interviews.OUTCOME] as Interview["outcome"],
    notes: opt(f[F.Interviews.NOTES]),
  };
}
export function interviewToAirtable(i: Partial<Interview>) {
  return cleanFields({
    [F.Interviews.SCHED_ID]: i.schedId,
    [F.Interviews.CANDIDATE]: i.candidateId !== undefined ? link(i.candidateId) : undefined,
    [F.Interviews.ROLE]: i.roleId !== undefined ? link(i.roleId) : undefined,
    [F.Interviews.DATE]: i.date,
    [F.Interviews.TIME]: i.time,
    [F.Interviews.WEEK_LABEL]: i.weekLabel,
    [F.Interviews.MONTH]: i.month,
    [F.Interviews.STAGE]: i.stage,
    [F.Interviews.TYPE]: i.type,
    [F.Interviews.LOCATION]: i.location,
    [F.Interviews.INTERVIEWERS]: i.interviewers?.join("\n"),
    [F.Interviews.CONFIRMED]: i.confirmed,
    [F.Interviews.REMINDER_SENT]: i.reminderSent,
    [F.Interviews.ATTENDANCE]: i.attendance,
    [F.Interviews.OUTCOME]: i.outcome,
    [F.Interviews.NOTES]: i.notes,
  });
}

// ---------- Work Trials ----------
function arrivalFromLabel(label: unknown): boolean | null {
  if (label === "Arrived") return true;
  if (label === "Not Arrived") return false;
  return null;
}
function arrivalToLabel(value: boolean | null | undefined): string | undefined {
  if (value === true) return "Arrived";
  if (value === false) return "Not Arrived";
  if (value === null) return "Pending";
  return undefined;
}
// See linesFromAirtable/linesToAirtable (below, in the ReferenceChecks
// section) for the newline-joined-text convention array fields use here —
// declared with `function` so they're hoisted and usable from this earlier
// point in the file.
function workTrialAiInsightsFromAirtable(f: Record<string, unknown>): WorkTrialAiInsights | null {
  const keys = F.WorkTrials;
  const summary = opt<string>(f[keys.AI_SUMMARY]);
  const generatedAt = opt<string>(f[keys.AI_GENERATED_AT]);
  if (!summary || !generatedAt) return null;
  return {
    overallStatus: (opt(f[keys.AI_OVERALL_STATUS]) ?? "Insufficient Data") as WorkTrialAiInsights["overallStatus"],
    summary,
    confidenceScore: num(f[keys.AI_CONFIDENCE_SCORE]),
    keyStrengths: linesFromAirtable(f[keys.AI_KEY_STRENGTHS]),
    areasOfConcern: linesFromAirtable(f[keys.AI_AREAS_OF_CONCERN]),
    alignmentNotes: str(f[keys.AI_ALIGNMENT_NOTES]),
    suggestedFollowUps: linesFromAirtable(f[keys.AI_FOLLOW_UP_QUESTIONS]),
    generatedAt,
  };
}

function workTrialAiInsightsToAirtable(insights: WorkTrialAiInsights | null | undefined) {
  if (insights === undefined) return {};
  // `null` is a deliberate "clear the insights" write (e.g. re-generation
  // failed) — write real blanks rather than skipping the fields.
  if (insights === null) {
    return {
      [F.WorkTrials.AI_OVERALL_STATUS]: null,
      [F.WorkTrials.AI_SUMMARY]: null,
      [F.WorkTrials.AI_CONFIDENCE_SCORE]: null,
      [F.WorkTrials.AI_KEY_STRENGTHS]: null,
      [F.WorkTrials.AI_AREAS_OF_CONCERN]: null,
      [F.WorkTrials.AI_ALIGNMENT_NOTES]: null,
      [F.WorkTrials.AI_FOLLOW_UP_QUESTIONS]: null,
      [F.WorkTrials.AI_GENERATED_AT]: null,
    };
  }
  return {
    [F.WorkTrials.AI_OVERALL_STATUS]: insights.overallStatus,
    [F.WorkTrials.AI_SUMMARY]: insights.summary,
    [F.WorkTrials.AI_CONFIDENCE_SCORE]: insights.confidenceScore,
    [F.WorkTrials.AI_KEY_STRENGTHS]: linesToAirtable(insights.keyStrengths),
    [F.WorkTrials.AI_AREAS_OF_CONCERN]: linesToAirtable(insights.areasOfConcern),
    [F.WorkTrials.AI_ALIGNMENT_NOTES]: insights.alignmentNotes,
    [F.WorkTrials.AI_FOLLOW_UP_QUESTIONS]: linesToAirtable(insights.suggestedFollowUps),
    [F.WorkTrials.AI_GENERATED_AT]: insights.generatedAt,
  };
}

export function workTrialFromAirtable(r: AirtableRecord): WorkTrial {
  const f = r.fields;
  return {
    id: r.id,
    wtId: str(f[F.WorkTrials.WT_ID]),
    candidateId: firstLink(f[F.WorkTrials.CANDIDATE]) ?? "",
    roleId: firstLink(f[F.WorkTrials.ROLE]) ?? undefined,
    branchId: firstLink(f[F.WorkTrials.BRANCH]) ?? "",
    date: str(f[F.WorkTrials.DATE]),
    supervisor: str(f[F.WorkTrials.SUPERVISOR]),
    createdAt: opt<string>(f[F.WorkTrials.CREATED_AT]) ?? undefined,
    arrivalMarked: arrivalFromLabel(f[F.WorkTrials.ARRIVAL_MARKED]),
    scoreTechnical: opt<number>(f[F.WorkTrials.SCORE_TECHNICAL]) ?? null,
    scorePatient: opt<number>(f[F.WorkTrials.SCORE_PATIENT]) ?? null,
    scoreSafety: opt<number>(f[F.WorkTrials.SCORE_SAFETY]) ?? null,
    scoreCulture: opt<number>(f[F.WorkTrials.SCORE_CULTURE]) ?? null,
    total: opt<number>(f[F.WorkTrials.TOTAL]) ?? null,
    passFail: f[F.WorkTrials.PASS_FAIL] as WorkTrial["passFail"],
    formSubmittedAt: opt<string>(f[F.WorkTrials.FORM_SUBMITTED_AT]) ?? null,
    submittedByRole: (opt<string>(f[F.WorkTrials.SUBMITTED_BY_ROLE]) ?? null) as WorkTrial["submittedByRole"],
    bmApprovedAt: opt<string>(f[F.WorkTrials.BM_APPROVED_AT]) ?? null,
    reminder12hSent: bool(f[F.WorkTrials.REMINDER_12H_SENT]),
    escalation24hSent: bool(f[F.WorkTrials.ESCALATION_24H_SENT]),
    commentCulture: opt<string>(f[F.WorkTrials.COMMENT_CULTURE]) ?? undefined,
    commentPatient: opt<string>(f[F.WorkTrials.COMMENT_PATIENT]) ?? undefined,
    commentTechnical: opt<string>(f[F.WorkTrials.COMMENT_TECHNICAL]) ?? undefined,
    strengths: opt<string>(f[F.WorkTrials.STRENGTHS]) ?? undefined,
    areasOfDevelopment: opt<string>(f[F.WorkTrials.AREAS_OF_DEVELOPMENT]) ?? undefined,
    overallRecommendation: opt<string>(f[F.WorkTrials.OVERALL_RECOMMENDATION]) ?? undefined,
    submissionMethod: (opt<string>(f[F.WorkTrials.SUBMISSION_METHOD]) ?? null) as WorkTrial["submissionMethod"],
    uploadedFormFiles: attachmentsFromAirtable(f[F.WorkTrials.UPLOADED_FORM]),
    roleCategory: opt<WorkTrialRoleCategory>(f[F.WorkTrials.ROLE_CATEGORY]),
    specialty: opt<string>(f[F.WorkTrials.SPECIALTY]),
    aiInsights: workTrialAiInsightsFromAirtable(f),
  };
}
export function workTrialToAirtable(w: Partial<WorkTrial>) {
  return cleanFields({
    [F.WorkTrials.WT_ID]: w.wtId,
    // Only pass linked-record arrays when the ID is a non-empty string —
    // an empty string creates [""] which Airtable rejects.
    [F.WorkTrials.CANDIDATE]: w.candidateId ? link(w.candidateId) : undefined,
    ...(w.roleId ? { [F.WorkTrials.ROLE]: link(w.roleId) } : {}),
    [F.WorkTrials.BRANCH]: w.branchId ? link(w.branchId) : undefined,
    [F.WorkTrials.DATE]: w.date,
    [F.WorkTrials.SUPERVISOR]: w.supervisor || undefined,
    [F.WorkTrials.CREATED_AT]: w.createdAt ? w.createdAt.slice(0, 10) : undefined,
    [F.WorkTrials.ARRIVAL_MARKED]: arrivalToLabel(w.arrivalMarked),
    [F.WorkTrials.SCORE_TECHNICAL]: w.scoreTechnical,
    [F.WorkTrials.SCORE_PATIENT]: w.scorePatient,
    [F.WorkTrials.SCORE_SAFETY]: w.scoreSafety,
    [F.WorkTrials.SCORE_CULTURE]: w.scoreCulture,
    [F.WorkTrials.TOTAL]: w.total,
    [F.WorkTrials.PASS_FAIL]: w.passFail,
    [F.WorkTrials.FORM_SUBMITTED_AT]: w.formSubmittedAt,
    [F.WorkTrials.SUBMITTED_BY_ROLE]: w.submittedByRole ?? undefined,
    [F.WorkTrials.BM_APPROVED_AT]: w.bmApprovedAt ?? undefined,
    [F.WorkTrials.REMINDER_12H_SENT]: w.reminder12hSent,
    [F.WorkTrials.ESCALATION_24H_SENT]: w.escalation24hSent,
    [F.WorkTrials.COMMENT_CULTURE]: w.commentCulture,
    [F.WorkTrials.COMMENT_PATIENT]: w.commentPatient,
    [F.WorkTrials.COMMENT_TECHNICAL]: w.commentTechnical,
    [F.WorkTrials.STRENGTHS]: w.strengths,
    [F.WorkTrials.AREAS_OF_DEVELOPMENT]: w.areasOfDevelopment,
    [F.WorkTrials.OVERALL_RECOMMENDATION]: w.overallRecommendation,
    [F.WorkTrials.SUBMISSION_METHOD]: w.submissionMethod ?? undefined,
    // Uploaded Form is intentionally not mapped here — attachments are
    // written via client.ts's uploadAttachment(), a separate Airtable API
    // call, not a plain field PATCH.
    [F.WorkTrials.ROLE_CATEGORY]: w.roleCategory ?? undefined,
    [F.WorkTrials.SPECIALTY]: w.specialty ?? undefined,
    ...workTrialAiInsightsToAirtable(w.aiInsights),
  });
}

// ---------- Work Trial Specialty Config ----------
export function specialtyConfigFromAirtable(r: AirtableRecord): SpecialtyConfig {
  const f = r.fields;
  const rawDays = Array.isArray(f[F.WorkTrialSpecialtyConfig.AVAILABLE_DAYS])
    ? (f[F.WorkTrialSpecialtyConfig.AVAILABLE_DAYS] as string[])
    : [];
  return {
    id: r.id,
    specialty: str(f[F.WorkTrialSpecialtyConfig.SPECIALTY]),
    displayName: str(f[F.WorkTrialSpecialtyConfig.DISPLAY_NAME]) || str(f[F.WorkTrialSpecialtyConfig.SPECIALTY]),
    branchIds: Array.isArray(f[F.WorkTrialSpecialtyConfig.BRANCHES])
      ? (f[F.WorkTrialSpecialtyConfig.BRANCHES] as string[])
      : [],
    availableDays: rawDays as WorkTrialDay[],
    active: bool(f[F.WorkTrialSpecialtyConfig.ACTIVE]),
    notes: str(f[F.WorkTrialSpecialtyConfig.NOTES]),
  };
}

// ---------- App Settings ----------
// Singleton table — see src/app/api/settings/route.ts for the find-or-create
// upsert that keeps it to exactly one row.
export function appSettingsFromAirtable(r: AirtableRecord): AppSettings {
  const f = r.fields;
  return {
    id: r.id,
    workTrialBookingCutoffDate: opt<string>(f[F.AppSettings.WORK_TRIAL_BOOKING_CUTOFF_DATE]) ?? null,
    updatedBy: opt<string>(f[F.AppSettings.UPDATED_BY]) ?? null,
    updatedAt: opt<string>(f[F.AppSettings.UPDATED_AT]) ?? null,
  };
}

export function appSettingsToAirtable(s: Partial<AppSettings> & { updatedBy?: string }) {
  return cleanFields({
    // `null` is a deliberate "clear the cutoff" write, not "leave it alone"
    // — cleanFields only drops `undefined`, so this reaches Airtable as a
    // real blank rather than being silently skipped.
    [F.AppSettings.WORK_TRIAL_BOOKING_CUTOFF_DATE]:
      s.workTrialBookingCutoffDate === undefined ? undefined : s.workTrialBookingCutoffDate,
    [F.AppSettings.UPDATED_BY]: s.updatedBy,
    [F.AppSettings.UPDATED_AT]: s.updatedBy ? new Date().toISOString() : undefined,
  });
}

// ---------- Reference Checks ----------
// A check holds 2-4 referees; Airtable stores them as flat REFEREE1-4 field
// blocks (no linked child table), so this prefix list is the single bridge
// between that flat storage and the ordered `referees` array.
const REFEREE_PREFIXES = ["REFEREE1", "REFEREE2", "REFEREE3", "REFEREE4"] as const;
type RefereePrefix = (typeof REFEREE_PREFIXES)[number];

function refereeFromAirtable(
  f: Record<string, unknown>,
  prefix: RefereePrefix
): RefereeStatus {
  const keys = F.ReferenceChecks as Record<string, string>;
  return {
    name: str(f[keys[`${prefix}_NAME`]]),
    email: str(f[keys[`${prefix}_EMAIL`]]),
    phone: str(f[keys[`${prefix}_PHONE`]]),
    emailSent: bool(f[keys[`${prefix}_EMAIL_SENT`]]),
    smsSent: bool(f[keys[`${prefix}_SMS_SENT`]]),
    responded: bool(f[keys[`${prefix}_RESPONDED`]]),
    respondedAt: opt(f[keys[`${prefix}_RESPONDED_AT`]]),
    relationship: opt(f[keys[`${prefix}_RELATIONSHIP`]]),
    directlySupervised: bool(f[keys[`${prefix}_DIRECTLY_SUPERVISED`]]),
    reportingRelationship: opt(f[keys[`${prefix}_REPORTING_RELATIONSHIP`]]),
    refereeOrganization: opt(f[keys[`${prefix}_ORGANIZATION`]]),
    durationKnown: opt(f[keys[`${prefix}_DURATION_KNOWN`]]),
    interactionFrequency: opt(f[keys[`${prefix}_INTERACTION_FREQUENCY`]]),
    jobTitleRecalled: opt(f[keys[`${prefix}_JOB_TITLE_RECALLED`]]),
    employmentFrom: opt(f[keys[`${prefix}_EMPLOYMENT_FROM`]]),
    employmentTo: opt(f[keys[`${prefix}_EMPLOYMENT_TO`]]),
    stillEmployed: bool(f[keys[`${prefix}_STILL_EMPLOYED`]]),
    mainResponsibilities: opt(f[keys[`${prefix}_MAIN_RESPONSIBILITIES`]]),
    reportedTo: opt(f[keys[`${prefix}_REPORTED_TO`]]),
    leavingReason: opt(f[keys[`${prefix}_LEAVING_REASON`]]),
    techScore: opt(f[keys[`${prefix}_TECH_SCORE`]]),
    reliabilityScore: opt(f[keys[`${prefix}_RELIABILITY_SCORE`]]),
    executionScore: opt(f[keys[`${prefix}_EXECUTION_SCORE`]]),
    executionExample: opt(f[keys[`${prefix}_EXECUTION_EXAMPLE`]]),
    teamworkScore: opt(f[keys[`${prefix}_TEAMWORK_SCORE`]]),
    teamworkExample: opt(f[keys[`${prefix}_TEAMWORK_EXAMPLE`]]),
    communicationScore: opt(f[keys[`${prefix}_COMMUNICATION_SCORE`]]),
    communicationExample: opt(f[keys[`${prefix}_COMMUNICATION_EXAMPLE`]]),
    problemSolvingScore: opt(f[keys[`${prefix}_PROBLEM_SOLVING_SCORE`]]),
    adaptabilityScore: opt(f[keys[`${prefix}_ADAPTABILITY_SCORE`]]),
    wouldRehire: opt(f[keys[`${prefix}_WOULD_REHIRE`]]),
    wouldRehireExplanation: opt(f[keys[`${prefix}_WOULD_REHIRE_EXPLANATION`]]),
    strengthExample: opt(f[keys[`${prefix}_STRENGTH_EXAMPLE`]]),
    developmentAreas: opt(f[keys[`${prefix}_DEVELOPMENT_AREAS`]]),
    strengthsAndDevelopment: opt(f[keys[`${prefix}_STRENGTHS_AND_DEVELOPMENT`]]),
    topStrengths: opt(f[keys[`${prefix}_TOP_STRENGTHS`]]),
    coachingArea: opt(f[keys[`${prefix}_COACHING_AREA`]]),
    feedbackResponse: opt(f[keys[`${prefix}_FEEDBACK_RESPONSE`]]),
    conflictExample: opt(f[keys[`${prefix}_CONFLICT_EXAMPLE`]]),
    honestyConcerns: opt(f[keys[`${prefix}_HONESTY_CONCERNS`]]),
    complianceIncidents: opt(f[keys[`${prefix}_COMPLIANCE_INCIDENTS`]]),
    licenseStanding: opt(f[keys[`${prefix}_LICENSE_STANDING`]]),
    preferPhoneNumber: opt(f[keys[`${prefix}_PREFER_PHONE_NUMBER`]]),
    overallRecommendScore: opt(f[keys[`${prefix}_OVERALL_RECOMMEND_SCORE`]]),
    recommendHire: opt(f[keys[`${prefix}_RECOMMEND_HIRE`]]),
    consentToContact: bool(f[keys[`${prefix}_CONSENT_TO_CONTACT`]]),
    notes: opt(f[keys[`${prefix}_NOTES`]]),
    googleVerified: bool(f[keys[`${prefix}_GOOGLE_VERIFIED`]]),
    googleVerifiedEmail: opt(f[keys[`${prefix}_GOOGLE_VERIFIED_EMAIL`]]),
    googleVerifiedOverrideBy: opt(f[keys[`${prefix}_GOOGLE_VERIFIED_OVERRIDE_BY`]]),
    reminder24hSent: bool(f[keys[`${prefix}_REMINDER_24H_SENT`]]),
    reminder48hSent: bool(f[keys[`${prefix}_REMINDER_48H_SENT`]]),
  };
}
// Symmetric write side of refereeFromAirtable. `referee` is undefined for a
// slot beyond how many referees are on the check (2-4 total) — in that case
// every field is written as `null` so removing a referee via edit actually
// clears any stale data left in that Airtable slot, rather than stranding it.
function refereeToAirtable(prefix: RefereePrefix, referee: RefereeStatus | undefined) {
  const keys = F.ReferenceChecks as Record<string, string>;
  const v = <T>(value: T | undefined): T | null => value ?? null;
  return {
    [keys[`${prefix}_NAME`]]: v(referee?.name),
    [keys[`${prefix}_EMAIL`]]: v(referee?.email),
    [keys[`${prefix}_PHONE`]]: v(referee?.phone),
    [keys[`${prefix}_EMAIL_SENT`]]: v(referee?.emailSent),
    [keys[`${prefix}_SMS_SENT`]]: v(referee?.smsSent),
    [keys[`${prefix}_RESPONDED`]]: v(referee?.responded),
    [keys[`${prefix}_RESPONDED_AT`]]: v(referee?.respondedAt?.slice(0, 10)),
    [keys[`${prefix}_RELATIONSHIP`]]: v(referee?.relationship),
    [keys[`${prefix}_DIRECTLY_SUPERVISED`]]: v(referee?.directlySupervised),
    [keys[`${prefix}_REPORTING_RELATIONSHIP`]]: v(referee?.reportingRelationship),
    [keys[`${prefix}_ORGANIZATION`]]: v(referee?.refereeOrganization),
    [keys[`${prefix}_DURATION_KNOWN`]]: v(referee?.durationKnown),
    [keys[`${prefix}_INTERACTION_FREQUENCY`]]: v(referee?.interactionFrequency),
    [keys[`${prefix}_JOB_TITLE_RECALLED`]]: v(referee?.jobTitleRecalled),
    [keys[`${prefix}_EMPLOYMENT_FROM`]]: v(referee?.employmentFrom),
    [keys[`${prefix}_EMPLOYMENT_TO`]]: v(referee?.employmentTo),
    [keys[`${prefix}_STILL_EMPLOYED`]]: v(referee?.stillEmployed),
    [keys[`${prefix}_MAIN_RESPONSIBILITIES`]]: v(referee?.mainResponsibilities),
    [keys[`${prefix}_REPORTED_TO`]]: v(referee?.reportedTo),
    [keys[`${prefix}_LEAVING_REASON`]]: v(referee?.leavingReason),
    [keys[`${prefix}_TECH_SCORE`]]: v(referee?.techScore),
    [keys[`${prefix}_RELIABILITY_SCORE`]]: v(referee?.reliabilityScore),
    [keys[`${prefix}_EXECUTION_SCORE`]]: v(referee?.executionScore),
    [keys[`${prefix}_EXECUTION_EXAMPLE`]]: v(referee?.executionExample),
    [keys[`${prefix}_TEAMWORK_SCORE`]]: v(referee?.teamworkScore),
    [keys[`${prefix}_TEAMWORK_EXAMPLE`]]: v(referee?.teamworkExample),
    [keys[`${prefix}_COMMUNICATION_SCORE`]]: v(referee?.communicationScore),
    [keys[`${prefix}_COMMUNICATION_EXAMPLE`]]: v(referee?.communicationExample),
    [keys[`${prefix}_PROBLEM_SOLVING_SCORE`]]: v(referee?.problemSolvingScore),
    [keys[`${prefix}_ADAPTABILITY_SCORE`]]: v(referee?.adaptabilityScore),
    [keys[`${prefix}_WOULD_REHIRE`]]: v(referee?.wouldRehire),
    [keys[`${prefix}_WOULD_REHIRE_EXPLANATION`]]: v(referee?.wouldRehireExplanation),
    [keys[`${prefix}_STRENGTH_EXAMPLE`]]: v(referee?.strengthExample),
    [keys[`${prefix}_DEVELOPMENT_AREAS`]]: v(referee?.developmentAreas),
    [keys[`${prefix}_STRENGTHS_AND_DEVELOPMENT`]]: v(referee?.strengthsAndDevelopment),
    [keys[`${prefix}_TOP_STRENGTHS`]]: v(referee?.topStrengths),
    [keys[`${prefix}_COACHING_AREA`]]: v(referee?.coachingArea),
    [keys[`${prefix}_FEEDBACK_RESPONSE`]]: v(referee?.feedbackResponse),
    [keys[`${prefix}_CONFLICT_EXAMPLE`]]: v(referee?.conflictExample),
    [keys[`${prefix}_HONESTY_CONCERNS`]]: v(referee?.honestyConcerns),
    [keys[`${prefix}_COMPLIANCE_INCIDENTS`]]: v(referee?.complianceIncidents),
    [keys[`${prefix}_LICENSE_STANDING`]]: v(referee?.licenseStanding),
    [keys[`${prefix}_PREFER_PHONE_NUMBER`]]: v(referee?.preferPhoneNumber),
    [keys[`${prefix}_OVERALL_RECOMMEND_SCORE`]]: v(referee?.overallRecommendScore),
    [keys[`${prefix}_RECOMMEND_HIRE`]]: v(referee?.recommendHire),
    [keys[`${prefix}_CONSENT_TO_CONTACT`]]: v(referee?.consentToContact),
    [keys[`${prefix}_NOTES`]]: v(referee?.notes),
    [keys[`${prefix}_GOOGLE_VERIFIED`]]: v(referee?.googleVerified),
    [keys[`${prefix}_GOOGLE_VERIFIED_EMAIL`]]: v(referee?.googleVerifiedEmail),
    [keys[`${prefix}_GOOGLE_VERIFIED_OVERRIDE_BY`]]: v(referee?.googleVerifiedOverrideBy),
    [keys[`${prefix}_REMINDER_24H_SENT`]]: v(referee?.reminder24hSent),
    [keys[`${prefix}_REMINDER_48H_SENT`]]: v(referee?.reminder48hSent),
  };
}
// Array-shaped AI fields are stored as newline-joined plain text rather than
// JSON — matches this table's existing convention of human-readable text
// fields (no JSON.stringify/parse anywhere else in this file), so a TA
// looking straight at the Airtable grid sees the strengths/concerns/
// follow-ups as plain bullet lines rather than a serialized blob.
function linesFromAirtable(v: unknown): string[] {
  const s = str(v).trim();
  return s ? s.split("\n").map((l) => l.trim()).filter(Boolean) : [];
}
function linesToAirtable(lines: string[] | undefined): string | undefined {
  return lines === undefined ? undefined : lines.join("\n");
}

function aiInsightsFromAirtable(f: Record<string, unknown>): ReferenceCheckAiInsights | null {
  const keys = F.ReferenceChecks;
  const summary = opt<string>(f[keys.AI_SUMMARY]);
  const generatedAt = opt<string>(f[keys.AI_GENERATED_AT]);
  // No summary/generatedAt means AI insights were never generated for this
  // record — every other AI field is meaningless without them.
  if (!summary || !generatedAt) return null;
  return {
    overallStatus: (opt(f[keys.AI_OVERALL_STATUS]) ?? "Insufficient Data") as ReferenceCheckAiInsights["overallStatus"],
    summary,
    recommendationScore: num(f[keys.AI_RECOMMENDATION_SCORE]),
    overallScore: num(f[keys.AI_OVERALL_SCORE]),
    confidenceScore: num(f[keys.AI_CONFIDENCE_SCORE]),
    keyStrengths: linesFromAirtable(f[keys.AI_KEY_STRENGTHS]),
    areasOfConcern: linesFromAirtable(f[keys.AI_AREAS_OF_CONCERN]),
    consistencyNotes: str(f[keys.AI_CONSISTENCY_NOTES]),
    suggestedFollowUps: linesFromAirtable(f[keys.AI_FOLLOW_UP_QUESTIONS]),
    // Index-aligned with `referees`. Historical 2-referee records simply have
    // the 2 newer AI_REFEREE3/4_TAKEAWAY fields blank, so this reads back as
    // a shorter array with no special-casing needed.
    refereeTakeaways: [
      str(f[keys.AI_REFEREE1_TAKEAWAY]),
      str(f[keys.AI_REFEREE2_TAKEAWAY]),
      str(f[keys.AI_REFEREE3_TAKEAWAY]),
      str(f[keys.AI_REFEREE4_TAKEAWAY]),
    ],
    generatedAt,
  };
}

function aiInsightsToAirtable(insights: ReferenceCheckAiInsights | null | undefined) {
  if (insights === undefined) return {};
  // `null` is a deliberate "clear the insights" write (e.g. re-generation
  // failed) — write real blanks rather than skipping the fields.
  if (insights === null) {
    return {
      [F.ReferenceChecks.AI_OVERALL_STATUS]: null,
      [F.ReferenceChecks.AI_SUMMARY]: null,
      [F.ReferenceChecks.AI_RECOMMENDATION_SCORE]: null,
      [F.ReferenceChecks.AI_OVERALL_SCORE]: null,
      [F.ReferenceChecks.AI_CONFIDENCE_SCORE]: null,
      [F.ReferenceChecks.AI_KEY_STRENGTHS]: null,
      [F.ReferenceChecks.AI_AREAS_OF_CONCERN]: null,
      [F.ReferenceChecks.AI_CONSISTENCY_NOTES]: null,
      [F.ReferenceChecks.AI_FOLLOW_UP_QUESTIONS]: null,
      [F.ReferenceChecks.AI_REFEREE1_TAKEAWAY]: null,
      [F.ReferenceChecks.AI_REFEREE2_TAKEAWAY]: null,
      [F.ReferenceChecks.AI_REFEREE3_TAKEAWAY]: null,
      [F.ReferenceChecks.AI_REFEREE4_TAKEAWAY]: null,
      [F.ReferenceChecks.AI_GENERATED_AT]: null,
    };
  }
  return {
    [F.ReferenceChecks.AI_OVERALL_STATUS]: insights.overallStatus,
    [F.ReferenceChecks.AI_SUMMARY]: insights.summary,
    [F.ReferenceChecks.AI_RECOMMENDATION_SCORE]: insights.recommendationScore,
    [F.ReferenceChecks.AI_OVERALL_SCORE]: insights.overallScore,
    [F.ReferenceChecks.AI_CONFIDENCE_SCORE]: insights.confidenceScore,
    [F.ReferenceChecks.AI_KEY_STRENGTHS]: linesToAirtable(insights.keyStrengths),
    [F.ReferenceChecks.AI_AREAS_OF_CONCERN]: linesToAirtable(insights.areasOfConcern),
    [F.ReferenceChecks.AI_CONSISTENCY_NOTES]: insights.consistencyNotes,
    [F.ReferenceChecks.AI_FOLLOW_UP_QUESTIONS]: linesToAirtable(insights.suggestedFollowUps),
    [F.ReferenceChecks.AI_REFEREE1_TAKEAWAY]: insights.refereeTakeaways[0] ?? "",
    [F.ReferenceChecks.AI_REFEREE2_TAKEAWAY]: insights.refereeTakeaways[1] ?? "",
    [F.ReferenceChecks.AI_REFEREE3_TAKEAWAY]: insights.refereeTakeaways[2] ?? "",
    [F.ReferenceChecks.AI_REFEREE4_TAKEAWAY]: insights.refereeTakeaways[3] ?? "",
    [F.ReferenceChecks.AI_GENERATED_AT]: insights.generatedAt,
  };
}

export function referenceCheckFromAirtable(r: AirtableRecord): ReferenceCheck {
  const f = r.fields;
  return {
    id: r.id,
    refId: str(f[F.ReferenceChecks.REF_ID]),
    candidateId: firstLink(f[F.ReferenceChecks.CANDIDATE]) ?? "",
    // Trailing unused slots (a check with fewer than 4 referees) come back
    // blank from Airtable — filter them out by empty name rather than
    // carrying "phantom" empty referees through the app.
    referees: REFEREE_PREFIXES.map((prefix) => refereeFromAirtable(f, prefix)).filter((r) => r.name),
    outcome: f[F.ReferenceChecks.OUTCOME] as ReferenceCheck["outcome"],
    driveFolderUrl: opt(f[F.ReferenceChecks.DRIVE_FOLDER_URL]) ?? null,
    createdAt: str(f[F.ReferenceChecks.CREATED_AT]),
    source: (f[F.ReferenceChecks.SOURCE] as ReferenceCheck["source"]) ?? "TA Added",
    status: (f[F.ReferenceChecks.STATUS] as ReferenceCheck["status"]) ?? "Awaiting Responses",
    verifiedAt: opt(f[F.ReferenceChecks.VERIFIED_AT]) ?? null,
    verifiedBy: opt(f[F.ReferenceChecks.VERIFIED_BY]) ?? null,
    initiatedAt: opt(f[F.ReferenceChecks.INITIATED_AT]) ?? null,
    // Server-attached PDF backup (see submitRefereeForm) — first attachment
    // in the field, if any; the field is cleared-then-uploaded so it never
    // holds more than one file.
    reportPdfUrl: attachmentsFromAirtable(f[F.ReferenceChecks.REPORT_PDF])?.[0]?.url ?? null,
    aiInsights: aiInsightsFromAirtable(f),
  };
}
export function referenceCheckToAirtable(rc: Partial<ReferenceCheck>) {
  // Only touch the REFEREE1-4 field blocks when `referees` is actually part
  // of this write (e.g. AI-insights-only saves pass `{ aiInsights }` and must
  // leave every referee field alone). When it is present, it's always the
  // full list (2-4), so every slot is rewritten — including blanking any
  // slot beyond the new length, so removing a referee actually clears it.
  const refereeWrites = rc.referees === undefined
    ? {}
    : Object.fromEntries(
        REFEREE_PREFIXES.flatMap((prefix, i) => Object.entries(refereeToAirtable(prefix, rc.referees![i])))
      );
  return cleanFields({
    [F.ReferenceChecks.REF_ID]: rc.refId,
    [F.ReferenceChecks.CANDIDATE]: rc.candidateId !== undefined ? link(rc.candidateId) : undefined,
    ...refereeWrites,
    [F.ReferenceChecks.OUTCOME]: rc.outcome,
    [F.ReferenceChecks.DRIVE_FOLDER_URL]: rc.driveFolderUrl,
    [F.ReferenceChecks.CREATED_AT]: rc.createdAt,
    [F.ReferenceChecks.SOURCE]: rc.source,
    [F.ReferenceChecks.STATUS]: rc.status,
    [F.ReferenceChecks.VERIFIED_AT]: rc.verifiedAt?.slice(0, 10) ?? rc.verifiedAt,
    [F.ReferenceChecks.VERIFIED_BY]: rc.verifiedBy,
    [F.ReferenceChecks.INITIATED_AT]: rc.initiatedAt?.slice(0, 10) ?? rc.initiatedAt,
    ...aiInsightsToAirtable(rc.aiInsights),
  });
}

// ---------- Offers ----------
export function offerFromAirtable(r: AirtableRecord): Offer {
  const f = r.fields;
  return {
    id: r.id,
    offerId: str(f[F.Offers.OFFER_ID]),
    candidateId: firstLink(f[F.Offers.CANDIDATE]) ?? "",
    offeredSalary: num(f[F.Offers.OFFERED_SALARY]),
    budgetedSalary: num(f[F.Offers.BUDGETED_SALARY]),
    dateSent: str(f[F.Offers.DATE_SENT]),
    deadline: str(f[F.Offers.DEADLINE]),
    outcome: f[F.Offers.OUTCOME] as Offer["outcome"],
    counterOfferAmount: opt(f[F.Offers.COUNTER_OFFER_AMOUNT]),
    finalAcceptedSalary: opt(f[F.Offers.FINAL_ACCEPTED_SALARY]),
    startDate: opt(f[F.Offers.START_DATE]),
    joined: f[F.Offers.JOINED] as Offer["joined"],
    dropReason: opt(f[F.Offers.DROP_REASON]),
  };
}
export function offerToAirtable(o: Partial<Offer>) {
  return cleanFields({
    [F.Offers.OFFER_ID]: o.offerId,
    [F.Offers.CANDIDATE]: o.candidateId !== undefined ? link(o.candidateId) : undefined,
    [F.Offers.OFFERED_SALARY]: o.offeredSalary,
    [F.Offers.BUDGETED_SALARY]: o.budgetedSalary,
    [F.Offers.DATE_SENT]: o.dateSent,
    [F.Offers.DEADLINE]: o.deadline,
    [F.Offers.OUTCOME]: o.outcome,
    [F.Offers.COUNTER_OFFER_AMOUNT]: o.counterOfferAmount,
    [F.Offers.FINAL_ACCEPTED_SALARY]: o.finalAcceptedSalary,
    [F.Offers.START_DATE]: o.startDate,
    [F.Offers.JOINED]: o.joined,
    [F.Offers.DROP_REASON]: o.dropReason,
  });
}

// ---------- New Employees ----------
export function newEmployeeFromAirtable(r: AirtableRecord): NewEmployee {
  const f = r.fields;
  return {
    id: r.id,
    employeeId: str(f[F.NewEmployees.EMPLOYEE_ID]),
    candidateId: firstLink(f[F.NewEmployees.CANDIDATE]) ?? "",
    name: str(f[F.NewEmployees.NAME]),
    role: str(f[F.NewEmployees.ROLE]),
    department: str(f[F.NewEmployees.DEPARTMENT]),
    branchId: firstLink(f[F.NewEmployees.BRANCH]) ?? "",
    startDate: str(f[F.NewEmployees.START_DATE]),
    employmentType: f[F.NewEmployees.EMPLOYMENT_TYPE] as NewEmployee["employmentType"],
    contractEnd: opt(f[F.NewEmployees.CONTRACT_END]),
    confirmation6mo: opt(f[F.NewEmployees.CONFIRMATION_6MO]),
    confirmation6moAt: opt(f[F.NewEmployees.CONFIRMATION_6MO_AT]),
    requisitionSubmitterName: opt(f[F.NewEmployees.REQ_SUBMITTER_NAME]),
    requisitionSubmitterEmail: opt(f[F.NewEmployees.REQ_SUBMITTER_EMAIL]),
  };
}
export function newEmployeeToAirtable(e: Partial<NewEmployee>) {
  return cleanFields({
    [F.NewEmployees.EMPLOYEE_ID]: e.employeeId,
    [F.NewEmployees.CANDIDATE]: e.candidateId !== undefined ? link(e.candidateId) : undefined,
    [F.NewEmployees.NAME]: e.name,
    [F.NewEmployees.ROLE]: e.role,
    [F.NewEmployees.DEPARTMENT]: e.department,
    [F.NewEmployees.BRANCH]: e.branchId !== undefined ? link(e.branchId) : undefined,
    [F.NewEmployees.START_DATE]: e.startDate,
    [F.NewEmployees.EMPLOYMENT_TYPE]: e.employmentType,
    [F.NewEmployees.CONTRACT_END]: e.contractEnd,
    [F.NewEmployees.CONFIRMATION_6MO]: e.confirmation6mo,
    [F.NewEmployees.CONFIRMATION_6MO_AT]: e.confirmation6moAt,
    [F.NewEmployees.REQ_SUBMITTER_NAME]: e.requisitionSubmitterName,
    [F.NewEmployees.REQ_SUBMITTER_EMAIL]: e.requisitionSubmitterEmail,
  });
}

// ---------- Relievers ----------
export function relieverFromAirtable(r: AirtableRecord): Reliever {
  const f = r.fields;
  return {
    id: r.id,
    relieverId: str(f[F.Relievers.RELIEVER_ID]),
    name: str(f[F.Relievers.NAME]),
    role: str(f[F.Relievers.ROLE]),
    branchesCovered: Array.isArray(f[F.Relievers.BRANCHES_COVERED])
      ? (f[F.Relievers.BRANCHES_COVERED] as string[])
      : [],
    startDate: opt<string>(f[F.Relievers.START_DATE]),
    email: opt<string>(f[F.Relievers.EMAIL]),
    status: f[F.Relievers.STATUS] as Reliever["status"],
    phone: str(f[F.Relievers.PHONE]),
    notes: opt(f[F.Relievers.NOTES]),
  };
}
export function relieverToAirtable(r: Partial<Reliever>) {
  return cleanFields({
    [F.Relievers.RELIEVER_ID]: r.relieverId,
    [F.Relievers.NAME]: r.name,
    [F.Relievers.ROLE]: r.role,
    [F.Relievers.BRANCHES_COVERED]: r.branchesCovered?.length ? r.branchesCovered : undefined,
    [F.Relievers.START_DATE]: r.startDate,
    [F.Relievers.EMAIL]: r.email,
    [F.Relievers.STATUS]: r.status,
    [F.Relievers.PHONE]: r.phone,
    [F.Relievers.NOTES]: r.notes,
  });
}

// ---------- Locums ----------
export function locumFromAirtable(r: AirtableRecord): Locum {
  const f = r.fields;
  return {
    id: r.id,
    locumId: str(f[F.Locums.LOCUM_ID]),
    name: str(f[F.Locums.NAME]),
    speciality: str(f[F.Locums.SPECIALITY]),
    branchesCovered: Array.isArray(f[F.Locums.BRANCHES_COVERED])
      ? (f[F.Locums.BRANCHES_COVERED] as string[])
      : [],
    dailyRate: num(f[F.Locums.DAILY_RATE]),
    licenseNumber: str(f[F.Locums.LICENSE_NUMBER]),
    availability: str(f[F.Locums.AVAILABILITY]),
    lastDeployed: opt(f[F.Locums.LAST_DEPLOYED]),
  };
}
export function locumToAirtable(l: Partial<Locum>) {
  return cleanFields({
    [F.Locums.LOCUM_ID]: l.locumId,
    [F.Locums.NAME]: l.name,
    [F.Locums.SPECIALITY]: l.speciality,
    [F.Locums.BRANCHES_COVERED]: l.branchesCovered,
    [F.Locums.DAILY_RATE]: l.dailyRate,
    [F.Locums.LICENSE_NUMBER]: l.licenseNumber,
    [F.Locums.AVAILABILITY]: l.availability,
    [F.Locums.LAST_DEPLOYED]: l.lastDeployed,
  });
}

// ---------- Staffing Projections ----------
export function staffingProjectionFromAirtable(r: AirtableRecord): StaffingProjection {
  const f = r.fields;
  return {
    id: r.id,
    month: str(f[F.StaffingProjections.MONTH]),
    branchId: firstLink(f[F.StaffingProjections.BRANCH]),
    cadre: f[F.StaffingProjections.CADRE] as StaffingProjection["cadre"],
    currentStaffingHc: num(f[F.StaffingProjections.CURRENT_STAFFING_HC]),
    notes: opt(f[F.StaffingProjections.NOTES]),
    updatedBy: opt(f[F.StaffingProjections.UPDATED_BY]),
    updatedAt: opt(f[F.StaffingProjections.UPDATED_AT]),
  };
}
export function staffingProjectionToAirtable(p: Partial<StaffingProjection>) {
  return cleanFields({
    [F.StaffingProjections.MONTH]: p.month,
    [F.StaffingProjections.BRANCH]: p.branchId !== undefined ? link(p.branchId) : undefined,
    [F.StaffingProjections.CADRE]: p.cadre,
    [F.StaffingProjections.CURRENT_STAFFING_HC]: p.currentStaffingHc,
    [F.StaffingProjections.NOTES]: p.notes,
    [F.StaffingProjections.UPDATED_BY]: p.updatedBy,
    [F.StaffingProjections.UPDATED_AT]: p.updatedAt,
  });
}
