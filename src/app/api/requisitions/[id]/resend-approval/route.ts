// Re-sends the current approver's email (fresh link + a new Approval
// Requested At, which is what re-fires the Airtable email automation).
// Gated to Recruitment User/Manager by the middleware like any other
// /api/requisitions mutation.
import { NextResponse } from "next/server";
import { resendApprovalRequest } from "@/lib/requisitions/approval";

const ERROR_STATUS = { not_found: 404, not_pending: 409, no_approver: 409 } as const;

export async function POST(_request: Request, { params }: { params: { id: string } }) {
  try {
    const outcome = await resendApprovalRequest(params.id);
    if (!outcome.ok) return NextResponse.json({ error: outcome.error }, { status: ERROR_STATUS[outcome.error] });
    return NextResponse.json({ requisition: outcome.requisition });
  } catch (err) {
    console.error(`[api/requisitions/${params.id}/resend-approval] failed:`, err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
