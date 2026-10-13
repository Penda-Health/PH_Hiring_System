// In-app approve/reject for a requisition. Deliberately exempt from the
// middleware's "Recruitment User or above" gate (see UNGATED_MUTATIONS in
// src/lib/permissions.ts): approvers are often HODs or directors with a
// view-only app role. Authorization happens here instead — the signed-in
// account must be the current step's named approver, or a Recruitment
// Manager explicitly overriding.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { decideRequisition } from "@/lib/requisitions/approval";
import { getCurrentUserIdentity } from "@/lib/supabase/server";

const bodySchema = z.object({
  decision: z.enum(["Approved", "Rejected"]),
  stepIndex: z.number().int().min(0).max(20),
  comment: z.string().trim().max(1000).optional(),
  override: z.boolean().optional(),
});

const ERROR_STATUS = { not_found: 404, not_pending: 409, stale_step: 409, not_approver: 403 } as const;

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const json = await request.json().catch(() => null);
  const result = bodySchema.safeParse(json);
  if (!result.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  if (result.data.decision === "Rejected" && !result.data.comment) {
    return NextResponse.json({ error: "comment_required" }, { status: 400 });
  }

  const identity = await getCurrentUserIdentity();
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (result.data.override && identity.role !== "recruitment_manager") {
    return NextResponse.json({ error: "not_approver" }, { status: 403 });
  }

  try {
    const outcome = await decideRequisition({
      requisitionId: params.id,
      stepIndex: result.data.stepIndex,
      actorEmail: identity.email,
      decision: result.data.decision,
      comment: result.data.comment,
      via: "in-app",
      override: result.data.override,
    });
    if (!outcome.ok) {
      return NextResponse.json({ error: outcome.error, expectedEmail: outcome.expectedEmail }, { status: ERROR_STATUS[outcome.error] });
    }
    return NextResponse.json({ requisition: outcome.requisition, openRoleId: outcome.openRoleId ?? null });
  } catch (err) {
    console.error(`[api/requisitions/${params.id}/decision] failed:`, err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
