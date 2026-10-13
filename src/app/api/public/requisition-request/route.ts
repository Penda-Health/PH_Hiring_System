// Public, no-login route backing /requisition-request/so and
// /requisition-request/ips. Unlike the other public/* routes, these links
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
import { toWorkflowPreview } from "@/lib/requisitions/workflow";

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, "public:requisition-request:get", { limit: 60, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;

  try {
    const segment = request.nextUrl.searchParams.get("segment") === "SO" ? "SO" : "IPS";
    const [branches, roleTitles, { workflows }] = await Promise.all([
      loadActiveBranches(segment),
      loadRoleTitleSuggestions(segment),
      loadApprovalSettings(),
    ]);
    // Labels and names only (no emails) for the form's "who approves this" strip.
    return NextResponse.json({ branches, roleTitles, approvers: toWorkflowPreview(workflows)[segment] });
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
  if (result.data.segment === "SO" && !result.data.budgetEvaluationConfirmed) {
    return NextResponse.json(
      { error: "invalid_request", issues: [{ message: "Budget evaluation confirmation is required for SO requests" }] },
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
