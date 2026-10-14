import { NextRequest, NextResponse } from "next/server";
import { getRecord, updateRecord } from "@/lib/airtable/client";
import { openRoleFromAirtable, openRoleToAirtable } from "@/lib/airtable/mappers";
import { TABLE_NAMES } from "@/lib/airtable/field-names";
import { openRoleSchema } from "@/lib/airtable/schemas";
import { notifyRoleStatusChange } from "@/lib/requisitions/role-notifications";
import { getCurrentUserIdentity } from "@/lib/supabase/server";

const patchSchema = openRoleSchema.partial();

// Same validation as the generic makeItemHandlers PATCH, plus one side
// effect: when the status moves into or out of Filled/Cancelled, the
// role's requisition thread in Google Chat hears about it (with days to
// close) — see src/lib/requisitions/role-notifications.ts. Reading the
// record first is what lets this tell a real status change from a re-save.
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const raw = await request.json();
    // Strip empty strings before validation, as makeItemHandlers does.
    const json = Object.fromEntries(Object.entries(raw).filter(([, v]) => v !== ""));
    const result = patchSchema.safeParse(json);
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid request body", issues: result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) },
        { status: 400 }
      );
    }

    const statusChanging = result.data.status !== undefined;
    const beforeRecord = statusChanging ? await getRecord(TABLE_NAMES.OpenRoles, params.id, { fresh: true }) : null;
    const record = await updateRecord(TABLE_NAMES.OpenRoles, params.id, openRoleToAirtable(result.data));
    const after = openRoleFromAirtable(record);

    if (beforeRecord) {
      const identity = await getCurrentUserIdentity();
      await notifyRoleStatusChange(openRoleFromAirtable(beforeRecord), after, identity?.name);
    }
    return NextResponse.json(after);
  } catch (err) {
    console.error(`[api] PATCH Open Roles/${params.id} failed:`, err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
