// Server-only. The requisition approval workflow: every requisition — in-app
// forms, the quick-add dialog and the public /requisition-request links —
// is created here as "Pending Approval", walks the approvers configured for
// its segment in /settings, and only becomes an Open Role once the last one
// approves.
//
// Notifications:
// - Approval emails are sent by an Airtable automation (SETUP.md §4.5.8),
//   the same pattern as referee invites: this module writes the current
//   approver's name/email, a signed Approval Link, a fresh Approval
//   Requested At and clears Approval Email Sent; the automation emails the
//   link and re-checks Approval Email Sent.
// - Google Chat messages are posted from here directly (google-chat.ts),
//   threaded per requisition, for every new request and every decision.
import { createRecord, getRecord, listRecords, updateRecord } from "@/lib/airtable/client";
import { TABLE_NAMES, F } from "@/lib/airtable/field-names";
import {
  appSettingsFromAirtable,
  branchFromAirtable,
  openRoleToAirtable,
  requisitionFromAirtable,
  requisitionToAirtable,
} from "@/lib/airtable/mappers";
import { nextSequentialId } from "@/lib/airtable/route-handlers";
import { signRequisitionApprovalToken } from "@/lib/forms/tokens";
import { postToGoogleChat } from "@/lib/notifications/google-chat";
import { buildOpenRoleFromRequisition, branchName } from "@/lib/requisitions-helpers";
import { approverTypeOf, resolveStep, sameEmail, stepsForType } from "@/lib/requisitions/workflow";
import {
  Branch,
  OpenRole,
  Requisition,
  RequisitionApprovalLogEntry,
  RequisitionApprovalStep,
  RequisitionWorkflows,
} from "@/types";

type ApprovalSettings = { workflows: RequisitionWorkflows | null; chatWebhookUrl: string | null };

export async function loadApprovalSettings(): Promise<ApprovalSettings> {
  const records = await listRecords(TABLE_NAMES.AppSettings);
  const settings = records[0] ? appSettingsFromAirtable(records[0]) : null;
  return {
    workflows: settings?.requisitionWorkflows ?? null,
    chatWebhookUrl: settings?.requisitionsChatWebhookUrl ?? null,
  };
}

function appUrl(): string {
  const base = process.env.NEXT_PUBLIC_APP_URL;
  if (!base) throw new Error("Missing NEXT_PUBLIC_APP_URL environment variable.");
  return base.replace(/\/$/, "");
}

async function loadBranches(): Promise<Branch[]> {
  return (await listRecords(TABLE_NAMES.Branches)).map(branchFromAirtable);
}

function truncate(text: string | undefined, max: number): string {
  const value = (text ?? "").trim();
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function personLine(step: RequisitionApprovalStep, branchLabel?: string): string {
  if (step.approverEmail) return `*${step.label}*: ${step.approverName} (${step.approverEmail})`;
  // A branch-based step with nobody on file — say exactly what to fix.
  const who = step.approverName ? `${step.approverName} — ` : "";
  const fix =
    approverTypeOf(step) === "branch_manager"
      ? `add the BM email for ${branchLabel ?? "the branch"} in Settings → Branches`
      : step.approverName
        ? `add ${step.approverName}'s Google account in Settings → Requisition approvals → Regional managers`
        : `set the Regional Manager for ${branchLabel ?? "the branch"} in Settings → Branches`;
  return `*${step.label}*: ${who}⚠️ no Google account on file, so no email was sent. To fix: ${fix}, then click "Resend email" on the request.`;
}

/**
 * Re-resolves a branch-based step (RM / BM) at the moment it becomes the
 * current one, so a Regional Manager added or changed after submission is
 * picked up. Writes the refreshed snapshot back if anything changed.
 */
async function resolveCurrentStep(req: Requisition, stepIndex: number): Promise<RequisitionApprovalStep[]> {
  const steps = req.approvalSteps ?? [];
  const step = steps[stepIndex];
  if (!step || approverTypeOf(step) === "person") return steps;
  const [{ workflows }, branches] = await Promise.all([loadApprovalSettings(), loadBranches()]);
  const resolved = resolveStep(step, branches.find((b) => b.id === req.branchId), workflows?.regionalManagers);
  if (resolved.approverEmail === step.approverEmail && resolved.approverName === step.approverName) return steps;
  const updated = steps.map((s, i) => (i === stepIndex ? resolved : s));
  await updateRecord(TABLE_NAMES.Requisitions, req.id, requisitionToAirtable({ approvalSteps: updated }));
  return updated;
}

/** One Google Chat thread per requisition — also used for its Open Role's closing message (role-notifications.ts). */
export function requisitionThreadKey(requisitionId: string): string {
  return `requisition-${requisitionId}`;
}

function threadKey(req: Requisition): string {
  return requisitionThreadKey(req.id);
}

/**
 * Points the requisition at approval step `stepIndex`: mints that step's
 * link and bumps Approval Requested At so the Airtable email automation
 * fires. Approval Email Sent is cleared in the same write — the automation's
 * "matches conditions" trigger only fires on a not-matching → matching
 * transition, so it must always see a fresh unchecked state.
 */
async function requestStep(requisitionId: string, stepIndex: number, step: RequisitionApprovalStep): Promise<Requisition> {
  const token = await signRequisitionApprovalToken({ requisitionId, stepIndex });
  // A blank email (unresolved RM/BM) still gets the link stored, but the
  // email automation requires Current Approver Email, so nothing is sent
  // until it's fixed and resent.
  const record = await updateRecord(TABLE_NAMES.Requisitions, requisitionId, {
    ...requisitionToAirtable({
      currentApproverIndex: stepIndex,
      currentApproverName: step.approverName,
      currentApproverEmail: step.approverEmail,
      approvalRequestedAt: new Date().toISOString(),
      approvalEmailSent: false,
    }),
    [F.Requisitions.APPROVAL_LINK]: `${appUrl()}/requisition-approval?token=${encodeURIComponent(token)}`,
  });
  return requisitionFromAirtable(record);
}

export type NewRequisitionInput = Omit<
  Requisition,
  "id" | "reqId" | "status" | "approverChain" | "currentApproverIndex" | "approvalSteps" | "approvalLog"
>;

/**
 * Creates a requisition and starts its approval workflow. Used by every
 * entry path (in-app and public link) so none of them can skip approval.
 */
export async function createRequisitionWithApproval(input: NewRequisitionInput): Promise<Requisition> {
  const [{ workflows, chatWebhookUrl }, reqId, branches] = await Promise.all([
    loadApprovalSettings(),
    nextSequentialId(TABLE_NAMES.Requisitions, { airtableField: F.Requisitions.REQ_ID, prefix: "REQ", pad: 3, min: 6 }, {}),
    loadBranches(),
  ]);
  const branch = branches.find((b) => b.id === input.branchId);
  const configured = stepsForType(workflows?.[input.segment], input.type).map((s) =>
    resolveStep(s, branch, workflows?.regionalManagers)
  );
  // Nobody approves their own request: a step whose approver is the
  // requester (e.g. an RM raising a gap for their own region) is dropped
  // and logged as skipped, and the request goes to the next approver.
  const skipped = configured.filter((s) => sameEmail(s.approverEmail, input.submitterEmail));
  const steps = configured.filter((s) => !skipped.includes(s));
  const submittedAt = new Date().toISOString();
  const skipLog: RequisitionApprovalLogEntry[] = skipped.map((s) => ({
    stepIndex: -1,
    label: s.label,
    approverEmail: s.approverEmail,
    decision: "Skipped",
    decidedBy: "system",
    decidedAt: submittedAt,
    comment: "The requester is this step's approver",
    via: "system",
  }));

  const created = await createRecord(
    TABLE_NAMES.Requisitions,
    requisitionToAirtable({
      ...input,
      reqId,
      status: "Pending Approval",
      approvalSteps: steps,
      approverChain: steps.map((s) => s.label),
      currentApproverIndex: 0,
      approvalLog: skipLog,
    })
  );
  let requisition = requisitionFromAirtable(created);
  if (steps.length > 0) requisition = await requestStep(requisition.id, 0, steps[0]);

  const branchLabel = branch ? branchName(branch.id, branches) : undefined;
  const lines = [
    `📝 *New ${requisition.segment} requisition — ${requisition.reqId}*`,
    `Role: ${requisition.roleTitle} ×${requisition.headcount}${requisition.branchId ? ` (${branchName(requisition.branchId, branches)})` : ""}`,
    `Type: ${requisition.type} · Urgency: ${requisition.urgency}`,
    `Requested by: ${requisition.submitterName || requisition.submittedBy}${requisition.submitterEmail ? ` (${requisition.submitterEmail})` : ""}`,
  ];
  if (requisition.currentHeadcount !== undefined || requisition.labourModelHeadcount !== undefined) {
    lines.push(
      `Staffing: ${requisition.currentHeadcount ?? "?"} in post (excl. planned exits) · labour model ${requisition.labourModelHeadcount ?? "?"}`
    );
  }
  const reason = truncate(requisition.context || requisition.justification, 300);
  if (reason) lines.push(`Reason: ${reason}`);
  for (const s of skipped) lines.push(`⏭️ ${s.label} step skipped — ${s.approverName} raised this request.`);
  lines.push(
    steps.length > 0
      ? `➡️ Awaiting approval — ${personLine(steps[0], branchLabel)}`
      : configured.length > 0
        ? `⚠️ Every approver on this workflow is the requester, so a Recruitment Manager needs to approve it in the app.`
        : `⚠️ No ${requisition.segment} approval workflow is set up. A Recruitment Manager needs to add approvers in Settings → Requisition approvals, then approve this request in the app.`
  );
  lines.push(`${appUrl()}/requisitions`);
  await postToGoogleChat(chatWebhookUrl, lines.join("\n"), threadKey(requisition));

  return requisition;
}

async function createOpenRoleFromRequisition(requisition: Requisition, branches: Branch[]): Promise<string> {
  const payload: Partial<OpenRole> = buildOpenRoleFromRequisition(requisition, branches, {
    isPublicSubmission: requisition.source === "public-link",
  });
  const roleId = await nextSequentialId(
    TABLE_NAMES.OpenRoles,
    { airtableField: F.OpenRoles.ROLE_ID, prefix: (body: Partial<OpenRole>) => (body.segment === "SO" ? "SO" : "IPS"), pad: 3 },
    payload
  );
  const fields = openRoleToAirtable(payload);
  fields[F.OpenRoles.ROLE_ID] = roleId;
  await createRecord(TABLE_NAMES.OpenRoles, fields);
  return roleId;
}

export type DecisionError = "not_found" | "not_pending" | "stale_step" | "not_approver";

export type DecisionResult =
  | { ok: true; requisition: Requisition; openRoleId?: string }
  | { ok: false; error: DecisionError; expectedEmail?: string };

/**
 * Records one approver's decision. `stepIndex` is the step the actor was
 * shown (from their emailed token, or the row they clicked in-app) — if the
 * requisition has moved on since, the decision is refused as stale rather
 * than silently applied to a different step.
 *
 * `override` lets a Recruitment Manager act on a step that isn't theirs
 * (approver on leave, or no workflow configured yet); it's logged as such.
 */
export async function decideRequisition(args: {
  requisitionId: string;
  stepIndex: number;
  actorEmail: string;
  decision: "Approved" | "Rejected";
  comment?: string;
  via: "email-link" | "in-app";
  override?: boolean;
}): Promise<DecisionResult> {
  const record = await getRecord(TABLE_NAMES.Requisitions, args.requisitionId, { fresh: true });
  if (!record) return { ok: false, error: "not_found" };
  const req = requisitionFromAirtable(record);
  if (req.status !== "Pending Approval") return { ok: false, error: "not_pending" };
  if (req.currentApproverIndex !== args.stepIndex) return { ok: false, error: "stale_step" };

  const steps = req.approvalSteps ?? [];
  const step = steps[args.stepIndex];
  const isNamedApprover = !!step && sameEmail(step.approverEmail, args.actorEmail);
  if (!isNamedApprover && !args.override) {
    return { ok: false, error: "not_approver", expectedEmail: step?.approverEmail };
  }

  const comment = args.comment?.trim() || undefined;
  const entry: RequisitionApprovalLogEntry = {
    stepIndex: args.stepIndex,
    label: step?.label ?? "Manager override",
    approverEmail: step?.approverEmail ?? "",
    decision: args.decision,
    decidedBy: args.actorEmail.toLowerCase(),
    decidedAt: new Date().toISOString(),
    comment,
    via: isNamedApprover ? args.via : "override",
  };
  const approvalLog = [...(req.approvalLog ?? []), entry];
  const nextIndex = args.stepIndex + 1;
  const isFinal = args.decision === "Rejected" || nextIndex >= steps.length;

  const { chatWebhookUrl } = await loadApprovalSettings();
  const actorLine =
    entry.via === "override"
      ? `${args.actorEmail} (Recruitment Manager override${step ? ` for ${step.label}` : ""})`
      : `${step!.label} — ${step!.approverName}`;
  const commentLine = comment ? `\nComment: ${truncate(comment, 500)}` : "";

  if (!isFinal) {
    await updateRecord(TABLE_NAMES.Requisitions, req.id, requisitionToAirtable({ approvalLog }));
    const refreshed = await resolveCurrentStep(req, nextIndex);
    const updated = await requestStep(req.id, nextIndex, refreshed[nextIndex]);
    const branchLabel = req.branchId ? branchName(req.branchId, await loadBranches()) : undefined;
    await postToGoogleChat(
      chatWebhookUrl,
      `✅ *${req.reqId}* (${req.roleTitle}) approved by ${actorLine}${commentLine}\n➡️ Next — ${personLine(refreshed[nextIndex], branchLabel)}`,
      threadKey(req)
    );
    return { ok: true, requisition: updated };
  }

  const finalRecord = await updateRecord(TABLE_NAMES.Requisitions, req.id, {
    ...requisitionToAirtable({
      approvalLog,
      status: args.decision === "Rejected" ? "Rejected" : "Converted to Open Role",
      currentApproverIndex: args.decision === "Rejected" ? args.stepIndex : steps.length,
    }),
    // Nothing left to approve: clear who's "up next" and kill the link so
    // the email automation has nothing to send.
    [F.Requisitions.CURRENT_APPROVER_NAME]: null,
    [F.Requisitions.CURRENT_APPROVER_EMAIL]: null,
    [F.Requisitions.APPROVAL_LINK]: null,
  });
  const finalReq = requisitionFromAirtable(finalRecord);

  if (args.decision === "Rejected") {
    await postToGoogleChat(
      chatWebhookUrl,
      `❌ *${req.reqId}* (${req.roleTitle}) rejected by ${actorLine}${commentLine}`,
      threadKey(req)
    );
    return { ok: true, requisition: finalReq };
  }

  const branches = await loadBranches();
  let openRoleId: string | undefined;
  try {
    openRoleId = await createOpenRoleFromRequisition(finalReq, branches);
  } catch (err) {
    // The approval itself is already recorded — don't report it as failed.
    // Surface the gap loudly instead so someone creates the role by hand.
    console.error(`[requisition-approval] Open Role creation failed for ${req.reqId}:`, err);
    await postToGoogleChat(
      chatWebhookUrl,
      `⚠️ *${req.reqId}* was fully approved, but creating its Open Role failed — please create it manually.`,
      threadKey(req)
    );
    return { ok: true, requisition: finalReq };
  }
  await postToGoogleChat(
    chatWebhookUrl,
    `🟢 *${req.reqId} fully approved* by ${actorLine}${commentLine}\nOpen Role *${openRoleId}* created: ${req.roleTitle} ×${req.headcount}${req.branchId ? ` (${branchName(req.branchId, branches)})` : ""}`,
    threadKey(req)
  );
  return { ok: true, requisition: finalReq, openRoleId };
}

/** Re-sends the current step's approval email (fresh link, fresh trigger). */
export async function resendApprovalRequest(
  requisitionId: string
): Promise<{ ok: true; requisition: Requisition } | { ok: false; error: "not_found" | "not_pending" | "no_approver" }> {
  const record = await getRecord(TABLE_NAMES.Requisitions, requisitionId, { fresh: true });
  if (!record) return { ok: false, error: "not_found" };
  const req = requisitionFromAirtable(record);
  if (req.status !== "Pending Approval") return { ok: false, error: "not_pending" };
  const steps = await resolveCurrentStep(req, req.currentApproverIndex);
  const step = steps[req.currentApproverIndex];
  if (!step?.approverEmail) return { ok: false, error: "no_approver" };
  return { ok: true, requisition: await requestStep(req.id, req.currentApproverIndex, step) };
}

/** What the public approval page shows — no bearer links, nothing beyond the request itself. */
export async function loadApprovalView(requisitionId: string) {
  const record = await getRecord(TABLE_NAMES.Requisitions, requisitionId, { fresh: true });
  if (!record) return null;
  const req = requisitionFromAirtable(record);
  const branches = await loadBranches();
  return {
    reqId: req.reqId,
    segment: req.segment,
    type: req.type,
    roleTitle: req.roleTitle,
    department: req.department,
    branch: req.branchId ? branchName(req.branchId, branches) : null,
    headcount: req.headcount,
    employmentType: req.employmentType ?? null,
    level: req.level ?? null,
    urgency: req.urgency,
    expectedStartDate: req.expectedStartDate ?? null,
    currentHeadcount: req.currentHeadcount ?? null,
    labourModelHeadcount: req.labourModelHeadcount ?? null,
    reason: req.gapReason ?? req.reasonType ?? null,
    justification: req.justification,
    context: req.context ?? null,
    salaryRangeMin: req.salaryRangeMin ?? null,
    salaryRangeMax: req.salaryRangeMax ?? null,
    submittedBy: req.submitterName || req.submittedBy,
    submitterEmail: req.submitterEmail ?? null,
    submittedAt: req.submittedAt,
    status: req.status,
    currentApproverIndex: req.currentApproverIndex,
    steps: (req.approvalSteps ?? []).map((s) => ({ label: s.label, approverName: s.approverName, approverEmail: s.approverEmail })),
    log: req.approvalLog ?? [],
  };
}

export type ApprovalView = NonNullable<Awaited<ReturnType<typeof loadApprovalView>>>;
