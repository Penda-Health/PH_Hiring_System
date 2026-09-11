// Generates (or regenerates) the AI "intelligence and insights layer" for
// one reference check and persists it to Airtable — the action behind the
// "Generate/Refresh AI insights" button on ReferenceCheckCard. Dashboard-only
// (Supabase session required), same gate as the report route. Unlike the
// report route (which only generates on demand as a side effect of a PDF
// download, and reuses whatever's already persisted), this route always
// regenerates — it's the explicit "do this now" action.
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadReferenceCheckReportData } from "@/lib/reports/reference-check-report";
import { generateReferenceCheckInsights } from "@/lib/ai/reference-check-summary";
import { updateRecord, getRecord } from "@/lib/airtable/client";
import { TABLE_NAMES } from "@/lib/airtable/field-names";
import { referenceCheckFromAirtable, referenceCheckToAirtable } from "@/lib/airtable/mappers";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const data = await loadReferenceCheckReportData(params.id);
    if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });

    if (data.referees.every((r) => !r.responded)) {
      return NextResponse.json({ error: "not_complete" }, { status: 409 });
    }

    const aiInsights = await generateReferenceCheckInsights(data);
    if (!aiInsights) {
      return NextResponse.json({ error: "generation_failed" }, { status: 502 });
    }

    await updateRecord(TABLE_NAMES.ReferenceChecks, params.id, referenceCheckToAirtable({ aiInsights }));

    // Re-fetch rather than hand-assembling the response — keeps this route
    // honest about what's actually now in Airtable (e.g. if a concurrent
    // edit landed in between) instead of trusting the in-memory patch.
    const updated = await getRecord(TABLE_NAMES.ReferenceChecks, params.id);
    if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });

    return NextResponse.json(referenceCheckFromAirtable(updated));
  } catch (err) {
    console.error("[api/reference-checks/[id]/ai-insights] failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
