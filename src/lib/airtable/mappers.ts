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
  ReferenceCheck,
  RefereeStatus,
  Offer,
  NewEmployee,
  Reliever,
  Locum,
} from "@/types";
import { AirtableRecord, cleanFields, firstLink, link } from "./client";
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
    regionalManager: str(f[F.Branches.REGIONAL_MANAGER]),
    capacity: num(f[F.Branches.CAPACITY]),
    active: bool(f[F.Branches.ACTIVE]),
  };
}
export function branchToAirtable(b: Partial<Branch>) {
  return cleanFields({
    [F.Branches.BRANCH_ID]: b.branchId,
    [F.Branches.NAME]: b.name,
    [F.Branches.CITY]: b.city,
    [F.Branches.REGION]: b.region,
    [F.Branches.BRANCH_MANAGER]: b.branchManager,
    [F.Branches.REGIONAL_MANAGER]: b.regionalManager,
    [F.Branches.CAPACITY]: b.capacity,
    [F.Branches.ACTIVE]: b.active,
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
    priority: f[F.OpenRoles.PRIORITY] as OpenRole["priority"],
    status: f[F.OpenRoles.STATUS] as OpenRole["status"],
    hcApproved: num(f[F.OpenRoles.HC_APPROVED]),
    hcFilled: num(f[F.OpenRoles.HC_FILLED]),
    recruiter: str(f[F.OpenRoles.RECRUITER]),
    hiringManager: str(f[F.OpenRoles.HIRING_MANAGER]),
    datePosted: str(f[F.OpenRoles.DATE_POSTED]),
    employmentType: opt(f[F.OpenRoles.EMPLOYMENT_TYPE]) as OpenRole["employmentType"],
    notes: opt(f[F.OpenRoles.NOTES]),
    requisitionId: firstLink(f[F.OpenRoles.REQUISITION]),
  };
}
export function openRoleToAirtable(r: Partial<OpenRole>) {
  return cleanFields({
    [F.OpenRoles.ROLE_ID]: r.roleId,
    [F.OpenRoles.TITLE]: r.title,
    [F.OpenRoles.SEGMENT]: r.segment,
    [F.OpenRoles.DEPARTMENT]: r.department,
    [F.OpenRoles.LOCATION]: r.location,
    [F.OpenRoles.BRANCH]: r.branchId !== undefined ? link(r.branchId) : undefined,
    [F.OpenRoles.PRIORITY]: r.priority,
    [F.OpenRoles.STATUS]: r.status,
    [F.OpenRoles.HC_APPROVED]: r.hcApproved,
    [F.OpenRoles.HC_FILLED]: r.hcFilled,
    [F.OpenRoles.RECRUITER]: r.recruiter,
    [F.OpenRoles.HIRING_MANAGER]: r.hiringManager,
    [F.OpenRoles.DATE_POSTED]: r.datePosted,
    [F.OpenRoles.EMPLOYMENT_TYPE]: r.employmentType,
    [F.OpenRoles.NOTES]: r.notes,
    [F.OpenRoles.REQUISITION]: r.requisitionId !== undefined ? link(r.requisitionId) : undefined,
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
    roleId: firstLink(f[F.Candidates.ROLE]) ?? "",
    stage: f[F.Candidates.STAGE] as Candidate["stage"],
    source: str(f[F.Candidates.SOURCE]),
    gender: f[F.Candidates.GENDER] as Candidate["gender"],
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
    [F.Candidates.ROLE]: c.roleId !== undefined ? link(c.roleId) : undefined,
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
    [F.Candidates.STAGE_ENTERED_AT]: c.stageEnteredAt,
    [F.Candidates.CREATED_AT]: c.createdAt,
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
export function workTrialFromAirtable(r: AirtableRecord): WorkTrial {
  const f = r.fields;
  return {
    id: r.id,
    wtId: str(f[F.WorkTrials.WT_ID]),
    candidateId: firstLink(f[F.WorkTrials.CANDIDATE]) ?? "",
    branchId: firstLink(f[F.WorkTrials.BRANCH]) ?? "",
    date: str(f[F.WorkTrials.DATE]),
    supervisor: str(f[F.WorkTrials.SUPERVISOR]),
    arrivalMarked: arrivalFromLabel(f[F.WorkTrials.ARRIVAL_MARKED]),
    scoreTechnical: opt<number>(f[F.WorkTrials.SCORE_TECHNICAL]) ?? null,
    scorePatient: opt<number>(f[F.WorkTrials.SCORE_PATIENT]) ?? null,
    scoreSafety: opt<number>(f[F.WorkTrials.SCORE_SAFETY]) ?? null,
    scoreCulture: opt<number>(f[F.WorkTrials.SCORE_CULTURE]) ?? null,
    total: opt<number>(f[F.WorkTrials.TOTAL]) ?? null,
    passFail: f[F.WorkTrials.PASS_FAIL] as WorkTrial["passFail"],
    formSubmittedAt: opt<string>(f[F.WorkTrials.FORM_SUBMITTED_AT]) ?? null,
    reminder12hSent: bool(f[F.WorkTrials.REMINDER_12H_SENT]),
    escalation24hSent: bool(f[F.WorkTrials.ESCALATION_24H_SENT]),
  };
}
export function workTrialToAirtable(w: Partial<WorkTrial>) {
  return cleanFields({
    [F.WorkTrials.WT_ID]: w.wtId,
    [F.WorkTrials.CANDIDATE]: w.candidateId !== undefined ? link(w.candidateId) : undefined,
    [F.WorkTrials.BRANCH]: w.branchId !== undefined ? link(w.branchId) : undefined,
    [F.WorkTrials.DATE]: w.date,
    [F.WorkTrials.SUPERVISOR]: w.supervisor,
    [F.WorkTrials.ARRIVAL_MARKED]: arrivalToLabel(w.arrivalMarked),
    [F.WorkTrials.SCORE_TECHNICAL]: w.scoreTechnical,
    [F.WorkTrials.SCORE_PATIENT]: w.scorePatient,
    [F.WorkTrials.SCORE_SAFETY]: w.scoreSafety,
    [F.WorkTrials.SCORE_CULTURE]: w.scoreCulture,
    [F.WorkTrials.TOTAL]: w.total,
    [F.WorkTrials.PASS_FAIL]: w.passFail,
    [F.WorkTrials.FORM_SUBMITTED_AT]: w.formSubmittedAt,
    [F.WorkTrials.REMINDER_12H_SENT]: w.reminder12hSent,
    [F.WorkTrials.ESCALATION_24H_SENT]: w.escalation24hSent,
  });
}

// ---------- Reference Checks ----------
function refereeFromAirtable(
  f: Record<string, unknown>,
  prefix: "REFEREE1" | "REFEREE2"
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
    durationKnown: opt(f[keys[`${prefix}_DURATION_KNOWN`]]),
    techScore: opt(f[keys[`${prefix}_TECH_SCORE`]]),
    reliabilityScore: opt(f[keys[`${prefix}_RELIABILITY_SCORE`]]),
    teamworkScore: opt(f[keys[`${prefix}_TEAMWORK_SCORE`]]),
    wouldRehire: opt(f[keys[`${prefix}_WOULD_REHIRE`]]),
    strengthExample: opt(f[keys[`${prefix}_STRENGTH_EXAMPLE`]]),
    developmentAreas: opt(f[keys[`${prefix}_DEVELOPMENT_AREAS`]]),
    notes: opt(f[keys[`${prefix}_NOTES`]]),
  };
}
export function referenceCheckFromAirtable(r: AirtableRecord): ReferenceCheck {
  const f = r.fields;
  return {
    id: r.id,
    refId: str(f[F.ReferenceChecks.REF_ID]),
    candidateId: firstLink(f[F.ReferenceChecks.CANDIDATE]) ?? "",
    referee1: refereeFromAirtable(f, "REFEREE1"),
    referee2: refereeFromAirtable(f, "REFEREE2"),
    outcome: f[F.ReferenceChecks.OUTCOME] as ReferenceCheck["outcome"],
    driveFolderUrl: opt(f[F.ReferenceChecks.DRIVE_FOLDER_URL]) ?? null,
    createdAt: str(f[F.ReferenceChecks.CREATED_AT]),
  };
}
export function referenceCheckToAirtable(rc: Partial<ReferenceCheck>) {
  return cleanFields({
    [F.ReferenceChecks.REF_ID]: rc.refId,
    [F.ReferenceChecks.CANDIDATE]: rc.candidateId !== undefined ? link(rc.candidateId) : undefined,
    [F.ReferenceChecks.REFEREE1_NAME]: rc.referee1?.name,
    [F.ReferenceChecks.REFEREE1_EMAIL]: rc.referee1?.email,
    [F.ReferenceChecks.REFEREE1_PHONE]: rc.referee1?.phone,
    [F.ReferenceChecks.REFEREE1_EMAIL_SENT]: rc.referee1?.emailSent,
    [F.ReferenceChecks.REFEREE1_SMS_SENT]: rc.referee1?.smsSent,
    [F.ReferenceChecks.REFEREE1_RESPONDED]: rc.referee1?.responded,
    [F.ReferenceChecks.REFEREE1_RESPONDED_AT]: rc.referee1?.respondedAt?.slice(0, 10),
    [F.ReferenceChecks.REFEREE1_RELATIONSHIP]: rc.referee1?.relationship,
    [F.ReferenceChecks.REFEREE1_DURATION_KNOWN]: rc.referee1?.durationKnown,
    [F.ReferenceChecks.REFEREE1_TECH_SCORE]: rc.referee1?.techScore,
    [F.ReferenceChecks.REFEREE1_RELIABILITY_SCORE]: rc.referee1?.reliabilityScore,
    [F.ReferenceChecks.REFEREE1_TEAMWORK_SCORE]: rc.referee1?.teamworkScore,
    [F.ReferenceChecks.REFEREE1_WOULD_REHIRE]: rc.referee1?.wouldRehire,
    [F.ReferenceChecks.REFEREE1_STRENGTH_EXAMPLE]: rc.referee1?.strengthExample,
    [F.ReferenceChecks.REFEREE1_DEVELOPMENT_AREAS]: rc.referee1?.developmentAreas,
    [F.ReferenceChecks.REFEREE1_NOTES]: rc.referee1?.notes,
    [F.ReferenceChecks.REFEREE2_NAME]: rc.referee2?.name,
    [F.ReferenceChecks.REFEREE2_EMAIL]: rc.referee2?.email,
    [F.ReferenceChecks.REFEREE2_PHONE]: rc.referee2?.phone,
    [F.ReferenceChecks.REFEREE2_EMAIL_SENT]: rc.referee2?.emailSent,
    [F.ReferenceChecks.REFEREE2_SMS_SENT]: rc.referee2?.smsSent,
    [F.ReferenceChecks.REFEREE2_RESPONDED]: rc.referee2?.responded,
    [F.ReferenceChecks.REFEREE2_RESPONDED_AT]: rc.referee2?.respondedAt?.slice(0, 10),
    [F.ReferenceChecks.REFEREE2_RELATIONSHIP]: rc.referee2?.relationship,
    [F.ReferenceChecks.REFEREE2_DURATION_KNOWN]: rc.referee2?.durationKnown,
    [F.ReferenceChecks.REFEREE2_TECH_SCORE]: rc.referee2?.techScore,
    [F.ReferenceChecks.REFEREE2_RELIABILITY_SCORE]: rc.referee2?.reliabilityScore,
    [F.ReferenceChecks.REFEREE2_TEAMWORK_SCORE]: rc.referee2?.teamworkScore,
    [F.ReferenceChecks.REFEREE2_WOULD_REHIRE]: rc.referee2?.wouldRehire,
    [F.ReferenceChecks.REFEREE2_STRENGTH_EXAMPLE]: rc.referee2?.strengthExample,
    [F.ReferenceChecks.REFEREE2_DEVELOPMENT_AREAS]: rc.referee2?.developmentAreas,
    [F.ReferenceChecks.REFEREE2_NOTES]: rc.referee2?.notes,
    [F.ReferenceChecks.OUTCOME]: rc.outcome,
    [F.ReferenceChecks.DRIVE_FOLDER_URL]: rc.driveFolderUrl,
    [F.ReferenceChecks.CREATED_AT]: rc.createdAt,
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
  });
}

// ---------- Relievers ----------
export function relieverFromAirtable(r: AirtableRecord): Reliever {
  const f = r.fields;
  return {
    id: r.id,
    name: str(f[F.Relievers.NAME]),
    role: str(f[F.Relievers.ROLE]),
    branchesCovered: Array.isArray(f[F.Relievers.BRANCHES_COVERED])
      ? (f[F.Relievers.BRANCHES_COVERED] as string[])
      : [],
    availabilityDates: str(f[F.Relievers.AVAILABILITY_DATES]),
    status: f[F.Relievers.STATUS] as Reliever["status"],
    phone: str(f[F.Relievers.PHONE]),
    notes: opt(f[F.Relievers.NOTES]),
  };
}
export function relieverToAirtable(r: Partial<Reliever>) {
  return cleanFields({
    [F.Relievers.RELIEVER_ID]: r.id,
    [F.Relievers.NAME]: r.name,
    [F.Relievers.ROLE]: r.role,
    [F.Relievers.BRANCHES_COVERED]: r.branchesCovered,
    [F.Relievers.AVAILABILITY_DATES]: r.availabilityDates,
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
    [F.Locums.LOCUM_ID]: l.id,
    [F.Locums.NAME]: l.name,
    [F.Locums.SPECIALITY]: l.speciality,
    [F.Locums.BRANCHES_COVERED]: l.branchesCovered,
    [F.Locums.DAILY_RATE]: l.dailyRate,
    [F.Locums.LICENSE_NUMBER]: l.licenseNumber,
    [F.Locums.AVAILABILITY]: l.availability,
    [F.Locums.LAST_DEPLOYED]: l.lastDeployed,
  });
}
