// Read-only view of the approval workflows for the request forms' "who
// approves this" preview. Any signed-in staff member can read it (GETs are
// never gated); it leaves out approver emails and the Chat webhook, which
// stay behind the Recruitment-Manager-only /api/settings.
import { NextResponse } from "next/server";
import { loadApprovalSettings } from "@/lib/requisitions/approval";
import { toWorkflowPreview } from "@/lib/requisitions/workflow";

export async function GET() {
  try {
    const { workflows } = await loadApprovalSettings();
    return NextResponse.json(toWorkflowPreview(workflows));
  } catch (err) {
    console.error("[api/requisitions/workflows] GET failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
