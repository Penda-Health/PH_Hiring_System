// Public, no-login route backing /requisition-request/so and
// /requisition-request/ips. Unlike the other public/* routes, these links
// are static and reusable (not minted per-submission), since approval and
// budget evaluation already happened over email before the link is shared —
// every valid POST here creates an already-approved Requisition + Open Role.
import { NextRequest, NextResponse } from "next/server";
import { publicRequisitionRequestSchema } from "@/lib/airtable/schemas";
import { loadActiveBranches, loadRoleTitleSuggestions, submitPublicRequisitionRequest } from "@/lib/forms/requisition-request-form";

export async function GET(request: NextRequest) {
  try {
    const segment = request.nextUrl.searchParams.get("segment") === "SO" ? "SO" : "IPS";
    const [branches, roleTitles] = await Promise.all([loadActiveBranches(), loadRoleTitleSuggestions(segment)]);
    return NextResponse.json({ branches, roleTitles });
  } catch (err) {
    console.error("[api/public/requisition-request] GET failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

  try {
    const { honeypot, ...input } = result.data;
    void honeypot;
    const { requisitionId } = await submitPublicRequisitionRequest(input);
    return NextResponse.json({ ok: true, requisitionId });
  } catch (err) {
    console.error("[api/public/requisition-request] POST failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
