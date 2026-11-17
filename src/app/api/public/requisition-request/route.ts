// Public, no-login route backing /requisition-request/so,
// /requisition-request/ips and /requisition-request/call-centre. Unlike the other public/* routes, these links
// are static and reusable (not minted per-submission). The submitter proves
// who they are with a Google sign-in (a Penda account), and every valid POST
// creates a "Pending Approval" Requisition that walks the segment's
// approval workflow (src/lib/requisitions/approval.ts) — nothing reaches the
// pipeline as an Open Role until the last approver signs off.
import { NextRequest, NextResponse } from "next/server";
import { isPendaEmail, publicRequisitionRequestSchema } from "@/lib/airtable/schemas";
import { verifyGoogleIdToken } from "@/lib/forms/google-verify";
import { loadActiveBranches, loadRoleTitleSuggestions, submitPublicRequisitionRequest } from "@/lib/forms/requisition-request-form";
import { rateLimit } from "@/lib/rate-limit";
import { loadApprovalSettings } from "@/lib/requisitions/approval";
import { callCentreBranch, isCallCentreRequest, toWorkflowPreview } from "@/lib/requisitions/workflow";
import { listRecords } from "@/lib/airtable/client";
import { TABLE_NAMES } from "@/lib/airtable/field-names";
import { branchFromAirtable } from "@/lib/airtable/mappers";

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, "public:requisition-request:get", { limit: 60, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;

  try {
    const param = request.nextUrl.searchParams.get("segment");
    if (param === "CallCentre") {
      // The call centre form has one branch — the call centre's — and its own chain.
      const [{ workflows }, branchRecords, roleTitles] = await Promise.all([
        loadApprovalSettings(),
        listRecords(TABLE_NAMES.Branches),
        loadRoleTitleSuggestions("SO"),
      ]);
      const b = callCentreBranch(workflows?.CallCentre, branchRecords.map(branchFromAirtable));
      const branches = b
        ? [{ id: b.id, name: b.name, city: b.city, regionalManager: b.regionalManager, branchManager: b.branchManager }]
        : [];
      return NextResponse.json({ branches, roleTitles, approvers: toWorkflowPreview(workflows).CallCentre });
    }
    const segment = param === "SO" ? "SO" : "IPS";
    const [branches, roleTitles, { workflows }] = await Promise.all([
      loadActiveBranches(segment),
      loadRoleTitleSuggestions(segment),
      loadApprovalSettings(),
    ]);
    // Labels and names only (no emails) for the form's "who approves this" strip.
    const preview = toWorkflowPreview(workflows);
    // The SO form also gets the Call Centre chain, shown when that department is picked.
    return NextResponse.json({
      branches,
      roleTitles,
      approvers: preview[segment],
      ...(segment === "SO" ? { callCentreApprovers: preview.CallCentre } : {}),
    });
  } catch (err) {
    console.error("[api/public/requisition-request] GET failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // This is the one public route with no per-submission token — a static,
  // reusable link that mints a real Requisition (and pings its approver and
  // the group chat) on every valid POST — so it gets the tightest budget of
  // any public route, on top of the Google sign-in and honeypot below.
  const limited = rateLimit(request, "public:requisition-request:post", { limit: 8, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;

  const json = await request.json().catch(() => null);
  const result = publicRequisitionRequestSchema.safeParse(json);
  if (!result.success) {
    return NextResponse.json({ error: "invalid_request", issues: result.error.issues }, { status: 422 });
  }
  if (result.data.honeypot) {
    return NextResponse.json({ ok: true });
  }
  // A call centre gap (from the call centre form, with staffing figures) is
  // confirmed by the HRBP instead of a budget evaluation.
  const hasStaffing = result.data.currentHeadcount !== undefined && result.data.labourModelHeadcount !== undefined;
  const callCentreGap = isCallCentreRequest(result.data) && hasStaffing;
  if (result.data.segment === "SO" && !callCentreGap && !result.data.budgetEvaluationConfirmed) {
    return NextResponse.json(
      { error: "invalid_request", issues: [{ message: "Budget evaluation confirmation is required for SO requests" }] },
      { status: 422 }
    );
  }

  if (result.data.segment === "IPS" && !hasStaffing) {
    return NextResponse.json(
      {
        error: "invalid_request",
        issues: [{ message: "Current headcount and labour model optimum are required for IPS requests" }],
      },
      { status: 422 }
    );
  }

  const identity = await verifyGoogleIdToken(result.data.credential);
  if (!identity) {
    return NextResponse.json({ error: "invalid_google_token" }, { status: 401 });
  }
  if (!isPendaEmail(identity.email)) {
    return NextResponse.json({ error: "not_penda_account", googleEmail: identity.email }, { status: 403 });
  }

  try {
    const { honeypot, credential, ...input } = result.data;
    void honeypot;
    void credential;
    const { requisitionId, reqId } = await submitPublicRequisitionRequest({
      ...input,
      submitterEmail: identity.email,
      submitterGoogleVerified: true,
    });
    return NextResponse.json({ ok: true, requisitionId, reqId });
  } catch (err) {
    console.error("[api/public/requisition-request] POST failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
