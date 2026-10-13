// Public, no-login route behind /requisition-approval?token=... — the link
// in an approver's email. Two independent checks guard every decision:
// the signed token (which requisition, which step — see tokens.ts) and a
// Google sign-in whose verified email must match that step's approver, so a
// forwarded email alone can't approve anything.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyRequisitionApprovalToken } from "@/lib/forms/tokens";
import { verifyGoogleIdToken } from "@/lib/forms/google-verify";
import { decideRequisition, loadApprovalView } from "@/lib/requisitions/approval";
import { sameEmail } from "@/lib/requisitions/workflow";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, "public:requisition-approval:get", { limit: 60, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;

  const payload = await verifyRequisitionApprovalToken(request.nextUrl.searchParams.get("token") ?? "");
  if (!payload) return NextResponse.json({ error: "invalid_token" }, { status: 401 });

  try {
    const view = await loadApprovalView(payload.requisitionId);
    if (!view) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json({
      view,
      stepIndex: payload.stepIndex,
      // The link is for this step only. Once it's decided (by this approver
      // or an override) the page shows the outcome instead of the buttons.
      isCurrentStep: view.status === "Pending Approval" && view.currentApproverIndex === payload.stepIndex,
      expectedEmail: view.steps[payload.stepIndex]?.approverEmail ?? null,
    });
  } catch (err) {
    console.error("[api/public/requisition-approval] GET failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

const bodySchema = z.object({
  token: z.string().min(1).max(4096),
  credential: z.string().min(1).max(4096),
  // Omitted = "just check who I signed in as" (the page does this right
  // after sign-in so a wrong account is caught before anyone types a comment).
  decision: z.enum(["Approved", "Rejected"]).optional(),
  comment: z.string().trim().max(1000).optional(),
});

const ERROR_STATUS = { not_found: 404, not_pending: 409, stale_step: 409, not_approver: 403 } as const;

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, "public:requisition-approval:post", { limit: 20, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;

  const json = await request.json().catch(() => null);
  const result = bodySchema.safeParse(json);
  if (!result.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const payload = await verifyRequisitionApprovalToken(result.data.token);
  if (!payload) return NextResponse.json({ error: "invalid_token" }, { status: 401 });

  const identity = await verifyGoogleIdToken(result.data.credential);
  if (!identity) return NextResponse.json({ error: "invalid_google_token" }, { status: 401 });

  try {
    if (!result.data.decision) {
      const view = await loadApprovalView(payload.requisitionId);
      if (!view) return NextResponse.json({ error: "not_found" }, { status: 404 });
      const expectedEmail = view.steps[payload.stepIndex]?.approverEmail ?? null;
      return NextResponse.json({ verified: sameEmail(expectedEmail, identity.email), googleEmail: identity.email, expectedEmail });
    }

    if (result.data.decision === "Rejected" && !result.data.comment) {
      return NextResponse.json({ error: "comment_required" }, { status: 400 });
    }

    const outcome = await decideRequisition({
      requisitionId: payload.requisitionId,
      stepIndex: payload.stepIndex,
      actorEmail: identity.email,
      decision: result.data.decision,
      comment: result.data.comment,
      via: "email-link",
    });
    if (!outcome.ok) {
      return NextResponse.json(
        { error: outcome.error, googleEmail: identity.email, expectedEmail: outcome.expectedEmail },
        { status: ERROR_STATUS[outcome.error] }
      );
    }
    return NextResponse.json({ ok: true, status: outcome.requisition.status, openRoleId: outcome.openRoleId ?? null });
  } catch (err) {
    console.error("[api/public/requisition-approval] POST failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
