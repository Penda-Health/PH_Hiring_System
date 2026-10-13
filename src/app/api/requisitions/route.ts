import { NextRequest, NextResponse } from "next/server";
import { makeCollectionHandlers } from "@/lib/airtable/route-handlers";
import { requisitionFromAirtable, requisitionToAirtable } from "@/lib/airtable/mappers";
import { TABLE_NAMES } from "@/lib/airtable/field-names";
import { requisitionCreateSchema } from "@/lib/airtable/schemas";
import { createRequisitionWithApproval } from "@/lib/requisitions/approval";
import { getCurrentUserIdentity } from "@/lib/supabase/server";

export const { GET } = makeCollectionHandlers(TABLE_NAMES.Requisitions, requisitionFromAirtable, requisitionToAirtable);

// Not the generic factory POST: a new requisition's status, approvers and
// submitter all come from the server (the configured workflow + the signed-in
// session), never from the request body — see src/lib/requisitions/approval.ts.
export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const result = requisitionCreateSchema.safeParse(json);
  if (!result.success) {
    return NextResponse.json(
      { error: "Invalid request body", issues: result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) },
      { status: 400 }
    );
  }

  try {
    const identity = await getCurrentUserIdentity();
    const requisition = await createRequisitionWithApproval({
      ...result.data,
      submittedBy: identity?.name ?? "Unknown",
      submittedAt: new Date().toISOString(),
      submitterName: identity?.name,
      submitterEmail: identity?.email,
      submitterGoogleVerified: !!identity,
      source: "internal",
    });
    return NextResponse.json(requisition, { status: 201 });
  } catch (err) {
    console.error("[api] POST Requisitions failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
