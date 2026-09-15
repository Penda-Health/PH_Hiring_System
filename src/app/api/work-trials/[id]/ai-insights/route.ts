// Generates (or regenerates) the AI "intelligence and insights layer" for
// one work trial and persists it to Airtable — the action behind the
// "Generate/Refresh AI insights" button in ManualReviewDialog
// (work-trial-card.tsx). Mirrors
// api/reference-checks/[id]/ai-insights/route.ts exactly — same auth gate,
// same "always regenerate on demand" behavior, same re-fetch-rather-than-
// trust-the-in-memory-patch response.
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadWorkTrialReportData } from "@/lib/reports/work-trial-report";
import { generateWorkTrialInsights } from "@/lib/ai/work-trial-summary";
import { updateRecord, getRecord } from "@/lib/airtable/client";
import { TABLE_NAMES } from "@/lib/airtable/field-names";
import { workTrialFromAirtable, workTrialToAirtable } from "@/lib/airtable/mappers";

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const data = await loadWorkTrialReportData(params.id);
    if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });

    if (data.total === null || data.passFail === "Pending") {
      return NextResponse.json({ error: "not_complete" }, { status: 409 });
    }

    const aiInsights = await generateWorkTrialInsights(data);
    if (!aiInsights) {
      return NextResponse.json({ error: "generation_failed" }, { status: 502 });
    }

    await updateRecord(TABLE_NAMES.WorkTrials, params.id, workTrialToAirtable({ aiInsights }));

    // Re-fetch rather than hand-assembling the response — keeps this route
    // honest about what's actually now in Airtable (e.g. if a concurrent
    // edit landed in between) instead of trusting the in-memory patch.
    // `{ fresh: true }` is required, not optional: this read happens right
    // after our own write above, well inside getRecord's normal 30s cache
    // window, so without it this can silently return the pre-write record.
    const updated = await getRecord(TABLE_NAMES.WorkTrials, params.id, { fresh: true });
    if (!updated) return NextResponse.json({ error: "not_found" }, { status: 404 });

    return NextResponse.json(workTrialFromAirtable(updated));
  } catch (err) {
    console.error("[api/work-trials/[id]/ai-insights] failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
