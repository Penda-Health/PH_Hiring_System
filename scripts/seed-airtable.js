#!/usr/bin/env node
// Seeds the Airtable base with the same mock data the app ships with
// (src/lib/mock-data). Run build-airtable-schema.js first so the 11 tables
// and fields already exist.
//
// Must be run through tsx (not plain node) so it can require the project's
// TypeScript mock-data modules and resolve the "@/*" path alias:
//   npx tsx scripts/seed-airtable.js

const { loadEnv } = require("./lib/env");
const { F } = require("./lib/airtable-schema");

loadEnv();

const API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!API_KEY || !BASE_ID) {
  console.error("Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID. Check your .env.local file.");
  process.exit(1);
}

const {
  branches,
  requisitions,
  openRoles,
  candidates,
  interviews,
  workTrials,
  referenceChecks,
  offers,
  newEmployees,
  relievers,
  locums,
} = require("../src/lib/mock-data");

const BASE_URL = `https://api.airtable.com/v0/${BASE_ID}`;

async function airtableRequest(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Airtable API error ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

// Airtable accepts at most 10 records per create call.
async function createRecords(tableName, records) {
  const created = [];
  for (let i = 0; i < records.length; i += 10) {
    const batch = records.slice(i, i + 10).map((fields) => ({ fields }));
    const json = await airtableRequest(`${BASE_URL}/${encodeURIComponent(tableName)}`, {
      method: "POST",
      body: JSON.stringify({ records: batch, typecast: true }),
    });
    created.push(...json.records);
  }
  return created;
}

// Drops undefined/null values so Airtable doesn't choke on empty fields,
// and skips empty arrays/strings for optional link/text fields.
function clean(fields) {
  const out = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    if (typeof value === "string" && value === "") continue;
    out[key] = value;
  }
  return out;
}

function link(recordId) {
  return recordId ? [recordId] : undefined;
}

async function seedBranches() {
  console.log(`Seeding Branches (${branches.length})...`);
  const records = branches.map((b) =>
    clean({
      [F.Branches.BRANCH_ID]: b.branchId,
      [F.Branches.NAME]: b.name,
      [F.Branches.CITY]: b.city,
      [F.Branches.REGION]: b.region,
      [F.Branches.BRANCH_MANAGER]: b.branchManager,
      [F.Branches.REGIONAL_MANAGER]: b.regionalManager,
      [F.Branches.CAPACITY]: b.capacity,
      [F.Branches.ACTIVE]: b.active,
    })
  );
  const created = await createRecords("Branches", records);
  const idMap = new Map();
  branches.forEach((b, i) => idMap.set(b.id, created[i].id));
  return idMap;
}

async function seedRequisitions(branchIdMap) {
  console.log(`Seeding Requisitions (${requisitions.length})...`);
  const records = requisitions.map((r) =>
    clean({
      [F.Requisitions.REQ_ID]: r.reqId,
      [F.Requisitions.TYPE]: r.type,
      [F.Requisitions.ROLE_TITLE]: r.roleTitle,
      [F.Requisitions.DEPARTMENT]: r.department,
      [F.Requisitions.SEGMENT]: r.segment,
      [F.Requisitions.GAP_REASON]: r.gapReason,
      [F.Requisitions.BRANCH]: link(branchIdMap.get(r.branchId)),
      [F.Requisitions.HEADCOUNT]: r.headcount,
      [F.Requisitions.JUSTIFICATION]: r.justification,
      [F.Requisitions.SALARY_MIN]: r.salaryRangeMin,
      [F.Requisitions.SALARY_MAX]: r.salaryRangeMax,
      [F.Requisitions.URGENCY]: r.urgency,
      [F.Requisitions.JD_ATTACHED]: r.jdAttached,
      [F.Requisitions.STATUS]: r.status,
      [F.Requisitions.APPROVER_CHAIN]: r.approverChain?.join("\n"),
      [F.Requisitions.CURRENT_APPROVER_INDEX]: r.currentApproverIndex,
      [F.Requisitions.SUBMITTED_BY]: r.submittedBy,
      [F.Requisitions.SUBMITTED_AT]: r.submittedAt,
      [F.Requisitions.EXPECTED_START_DATE]: r.expectedStartDate,
      [F.Requisitions.CONTEXT]: r.context,
    })
  );
  const created = await createRecords("Requisitions", records);
  const idMap = new Map();
  requisitions.forEach((r, i) => idMap.set(r.id, created[i].id));
  return idMap;
}

async function seedOpenRoles(branchIdMap, requisitionIdMap) {
  console.log(`Seeding Open Roles (${openRoles.length})...`);
  const records = openRoles.map((role) =>
    clean({
      [F.OpenRoles.ROLE_ID]: role.roleId,
      [F.OpenRoles.TITLE]: role.title,
      [F.OpenRoles.SEGMENT]: role.segment,
      [F.OpenRoles.DEPARTMENT]: role.department,
      [F.OpenRoles.LOCATION]: role.location,
      [F.OpenRoles.BRANCH]: link(branchIdMap.get(role.branchId)),
      [F.OpenRoles.PRIORITY]: role.priority,
      [F.OpenRoles.STATUS]: role.status,
      [F.OpenRoles.HC_APPROVED]: role.hcApproved,
      [F.OpenRoles.HC_FILLED]: role.hcFilled,
      [F.OpenRoles.RECRUITER]: role.recruiter,
      [F.OpenRoles.HIRING_MANAGER]: role.hiringManager,
      [F.OpenRoles.DATE_POSTED]: role.datePosted,
      [F.OpenRoles.REQUISITION]: link(requisitionIdMap.get(role.requisitionId)),
    })
  );
  const created = await createRecords("Open Roles", records);
  const idMap = new Map();
  openRoles.forEach((role, i) => idMap.set(role.id, created[i].id));
  return idMap;
}

async function seedCandidates(roleIdMap) {
  console.log(`Seeding Candidates (${candidates.length})...`);
  const records = candidates.map((c) =>
    clean({
      [F.Candidates.CAND_ID]: c.candId,
      [F.Candidates.NAME]: c.name,
      [F.Candidates.PHONE]: c.phone,
      [F.Candidates.EMAIL]: c.email,
      [F.Candidates.ROLE]: link(roleIdMap.get(c.roleId)),
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
    })
  );
  const created = await createRecords("Candidates", records);
  const idMap = new Map();
  candidates.forEach((c, i) => idMap.set(c.id, created[i].id));
  return idMap;
}

async function seedInterviews(candidateIdMap, roleIdMap) {
  console.log(`Seeding Interviews (${interviews.length})...`);
  const records = interviews.map((iv) =>
    clean({
      [F.Interviews.SCHED_ID]: iv.schedId,
      [F.Interviews.CANDIDATE]: link(candidateIdMap.get(iv.candidateId)),
      [F.Interviews.ROLE]: link(roleIdMap.get(iv.roleId)),
      [F.Interviews.DATE]: iv.date,
      [F.Interviews.TIME]: iv.time,
      [F.Interviews.WEEK_LABEL]: iv.weekLabel,
      [F.Interviews.MONTH]: iv.month,
      [F.Interviews.STAGE]: iv.stage,
      [F.Interviews.TYPE]: iv.type,
      [F.Interviews.LOCATION]: iv.location,
      [F.Interviews.INTERVIEWERS]: iv.interviewers?.join("\n"),
      [F.Interviews.CONFIRMED]: iv.confirmed,
      [F.Interviews.REMINDER_SENT]: iv.reminderSent,
      [F.Interviews.ATTENDANCE]: iv.attendance,
      [F.Interviews.OUTCOME]: iv.outcome,
      [F.Interviews.NOTES]: iv.notes,
    })
  );
  await createRecords("Interviews", records);
}

function arrivalLabel(arrivalMarked) {
  if (arrivalMarked === true) return "Arrived";
  if (arrivalMarked === false) return "Not Arrived";
  return "Pending";
}

async function seedWorkTrials(candidateIdMap, branchIdMap) {
  console.log(`Seeding Work Trials (${workTrials.length})...`);
  const records = workTrials.map((wt) =>
    clean({
      [F.WorkTrials.WT_ID]: wt.wtId,
      [F.WorkTrials.CANDIDATE]: link(candidateIdMap.get(wt.candidateId)),
      [F.WorkTrials.BRANCH]: link(branchIdMap.get(wt.branchId)),
      [F.WorkTrials.DATE]: wt.date,
      [F.WorkTrials.SUPERVISOR]: wt.supervisor,
      [F.WorkTrials.ARRIVAL_MARKED]: arrivalLabel(wt.arrivalMarked),
      [F.WorkTrials.SCORE_TECHNICAL]: wt.scoreTechnical,
      [F.WorkTrials.SCORE_PATIENT]: wt.scorePatient,
      [F.WorkTrials.SCORE_SAFETY]: wt.scoreSafety,
      [F.WorkTrials.SCORE_CULTURE]: wt.scoreCulture,
      [F.WorkTrials.TOTAL]: wt.total,
      [F.WorkTrials.PASS_FAIL]: wt.passFail,
      [F.WorkTrials.FORM_SUBMITTED_AT]: wt.formSubmittedAt,
      [F.WorkTrials.REMINDER_12H_SENT]: wt.reminder12hSent,
      [F.WorkTrials.ESCALATION_24H_SENT]: wt.escalation24hSent,
    })
  );
  await createRecords("Work Trials", records);
}

async function seedReferenceChecks(candidateIdMap) {
  console.log(`Seeding Reference Checks (${referenceChecks.length})...`);
  const records = referenceChecks.map((rc) =>
    clean({
      [F.ReferenceChecks.REF_ID]: rc.refId,
      [F.ReferenceChecks.CANDIDATE]: link(candidateIdMap.get(rc.candidateId)),
      [F.ReferenceChecks.REFEREE1_NAME]: rc.referee1?.name,
      [F.ReferenceChecks.REFEREE1_EMAIL]: rc.referee1?.email,
      [F.ReferenceChecks.REFEREE1_PHONE]: rc.referee1?.phone,
      [F.ReferenceChecks.REFEREE1_EMAIL_SENT]: rc.referee1?.emailSent,
      [F.ReferenceChecks.REFEREE1_SMS_SENT]: rc.referee1?.smsSent,
      [F.ReferenceChecks.REFEREE1_RESPONDED]: rc.referee1?.responded,
      [F.ReferenceChecks.REFEREE1_RESPONDED_AT]: rc.referee1?.respondedAt?.slice(0, 10),
      [F.ReferenceChecks.REFEREE2_NAME]: rc.referee2?.name,
      [F.ReferenceChecks.REFEREE2_EMAIL]: rc.referee2?.email,
      [F.ReferenceChecks.REFEREE2_PHONE]: rc.referee2?.phone,
      [F.ReferenceChecks.REFEREE2_EMAIL_SENT]: rc.referee2?.emailSent,
      [F.ReferenceChecks.REFEREE2_SMS_SENT]: rc.referee2?.smsSent,
      [F.ReferenceChecks.REFEREE2_RESPONDED]: rc.referee2?.responded,
      [F.ReferenceChecks.REFEREE2_RESPONDED_AT]: rc.referee2?.respondedAt?.slice(0, 10),
      [F.ReferenceChecks.OUTCOME]: rc.outcome,
      [F.ReferenceChecks.DRIVE_FOLDER_URL]: rc.driveFolderUrl,
      [F.ReferenceChecks.CREATED_AT]: rc.createdAt,
    })
  );
  await createRecords("Reference Checks", records);
}

async function seedOffers(candidateIdMap) {
  console.log(`Seeding Offers (${offers.length})...`);
  const records = offers.map((o) =>
    clean({
      [F.Offers.OFFER_ID]: o.offerId,
      [F.Offers.CANDIDATE]: link(candidateIdMap.get(o.candidateId)),
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
    })
  );
  await createRecords("Offers", records);
}

async function seedNewEmployees(candidateIdMap, branchIdMap) {
  console.log(`Seeding New Employees (${newEmployees.length})...`);
  const records = newEmployees.map((e) =>
    clean({
      [F.NewEmployees.EMPLOYEE_ID]: e.employeeId,
      [F.NewEmployees.CANDIDATE]: link(candidateIdMap.get(e.candidateId)),
      [F.NewEmployees.NAME]: e.name,
      [F.NewEmployees.ROLE]: e.role,
      [F.NewEmployees.DEPARTMENT]: e.department,
      [F.NewEmployees.BRANCH]: link(branchIdMap.get(e.branchId)),
      [F.NewEmployees.START_DATE]: e.startDate,
      [F.NewEmployees.EMPLOYMENT_TYPE]: e.employmentType,
      [F.NewEmployees.CONTRACT_END]: e.contractEnd,
    })
  );
  await createRecords("New Employees", records);
}

async function seedRelievers() {
  console.log(`Seeding Relievers (${relievers.length})...`);
  const records = relievers.map((r) =>
    clean({
      [F.Relievers.RELIEVER_ID]: r.id,
      [F.Relievers.NAME]: r.name,
      [F.Relievers.ROLE]: r.role,
      [F.Relievers.BRANCHES_COVERED]: r.branchesCovered,
      [F.Relievers.AVAILABILITY_DATES]: r.availabilityDates,
      [F.Relievers.STATUS]: r.status,
      [F.Relievers.PHONE]: r.phone,
      [F.Relievers.NOTES]: r.notes,
    })
  );
  await createRecords("Relievers", records);
}

async function seedLocums() {
  console.log(`Seeding Locums (${locums.length})...`);
  const records = locums.map((l) =>
    clean({
      [F.Locums.LOCUM_ID]: l.id,
      [F.Locums.NAME]: l.name,
      [F.Locums.SPECIALITY]: l.speciality,
      [F.Locums.BRANCHES_COVERED]: l.branchesCovered,
      [F.Locums.DAILY_RATE]: l.dailyRate,
      [F.Locums.LICENSE_NUMBER]: l.licenseNumber,
      [F.Locums.AVAILABILITY]: l.availability,
      [F.Locums.LAST_DEPLOYED]: l.lastDeployed,
    })
  );
  await createRecords("Locums", records);
}

async function main() {
  console.log(`Seeding Airtable base ${BASE_ID}\n`);

  const branchIdMap = await seedBranches();
  const requisitionIdMap = await seedRequisitions(branchIdMap);
  const roleIdMap = await seedOpenRoles(branchIdMap, requisitionIdMap);
  const candidateIdMap = await seedCandidates(roleIdMap);
  await seedInterviews(candidateIdMap, roleIdMap);
  await seedWorkTrials(candidateIdMap, branchIdMap);
  await seedReferenceChecks(candidateIdMap);
  await seedOffers(candidateIdMap);
  await seedNewEmployees(candidateIdMap, branchIdMap);
  await seedRelievers();
  await seedLocums();

  console.log("\nSeed complete.");
}

main().catch((err) => {
  console.error("\nSeed failed:", err.message);
  process.exit(1);
});
