// App-wide settings — a singleton Airtable row (see scripts/lib/airtable-schema.js's
// "App Settings" table). Recruitment-manager only: gated in src/middleware.ts
// via ROLE_ROUTES["/api/settings"], the same restriction as the /settings page
// itself, so there's no separate role check needed here. Deliberately not
// built on the generic makeCollectionHandlers factory (route-handlers.ts) —
// that's for list-shaped Airtable tables; this is always exactly one record.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listRecords, createRecord, updateRecord } from "@/lib/airtable/client";
import { TABLE_NAMES } from "@/lib/airtable/field-names";
import { appSettingsFromAirtable, appSettingsToAirtable } from "@/lib/airtable/mappers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function getSettingsRecord() {
  const records = await listRecords(TABLE_NAMES.AppSettings);
  return records[0] ?? null;
}

export async function GET() {
  try {
    const record = await getSettingsRecord();
    return NextResponse.json(
      record
        ? appSettingsFromAirtable(record)
        : { id: null, workTrialBookingCutoffDate: null, updatedBy: null, updatedAt: null }
    );
  } catch (err) {
    console.error("[api/settings] GET failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

const patchSchema = z.object({
  // Exclusive cutoff date, or null to clear it back to the default rolling
  // window — see src/lib/work-trial-timing.ts.
  workTrialBookingCutoffDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format")
    .nullable(),
});

export async function PATCH(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const result = patchSchema.safeParse(json);
  if (!result.success) {
    return NextResponse.json({ error: "invalid_request", detail: result.error.flatten() }, { status: 400 });
  }

  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
    const updatedBy = user?.email ?? "unknown";

    const existing = await getSettingsRecord();
    const fields = appSettingsToAirtable({
      workTrialBookingCutoffDate: result.data.workTrialBookingCutoffDate,
      updatedBy,
    });

    const record = existing
      ? await updateRecord(TABLE_NAMES.AppSettings, existing.id, fields)
      : await createRecord(TABLE_NAMES.AppSettings, fields);

    return NextResponse.json(appSettingsFromAirtable(record));
  } catch (err) {
    console.error("[api/settings] PATCH failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
