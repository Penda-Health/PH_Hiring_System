// Streams a Penda-branded PDF report for one reference check. Dashboard-only
// (Supabase session required) — mirrors work-trials/[id]/report. Unlike the
// work-trial report, a partial report (only some referees have responded) is
// allowed and useful — the 409 only fires when none of them have answered
// yet, i.e. there's nothing at all to report on.
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadReferenceCheckReportData } from "@/lib/reports/reference-check-report";
import { generateReferenceCheckReportPdf } from "@/lib/reports/reference-check-report-pdf";
import { generateReferenceCheckInsights } from "@/lib/ai/reference-check-summary";
import { updateRecord } from "@/lib/airtable/client";
import { TABLE_NAMES } from "@/lib/airtable/field-names";
import { referenceCheckToAirtable } from "@/lib/airtable/mappers";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
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

    // Reuse persisted insights (generated on request from the dashboard
    // card, or by an earlier report at Ready for Offer) rather than
    // re-calling the AI provider on every download — keeps the report
    // instant after the first generation and keeps the PDF, the card, and
    // Penny's chat context all showing the same analysis instead of three
    // independently-regenerated ones. Auto-generate here, and persist the
    // result, only once the check has reached Ready for Offer — generating
    // it off an early download (only 1 of 2+ referees in) would bake in an
    // analysis that's blind to the referees who haven't responded yet, and
    // then never get regenerated once they do (attachReportPdf in
    // referee-form.ts only fills this in when it's still null). Before that
    // point the PDF just omits the AI section, unless a TA explicitly
    // generated one early via the card's "Generate AI insights" button —
    // that's an on-request case we always honor once it exists.
    let aiInsights = data.aiInsights;
    if (!aiInsights && data.status === "Ready for Offer") {
      // Never lets a slow/unavailable AI provider block the report — it
      // already returns null on any failure (see the module for why).
      aiInsights = await generateReferenceCheckInsights(data);
      if (aiInsights) {
        try {
          await updateRecord(TABLE_NAMES.ReferenceChecks, params.id, referenceCheckToAirtable({ aiInsights }));
        } catch (err) {
          // Persistence failing shouldn't block the report the TA is
          // actively trying to download — it'll just regenerate next time.
          console.error("[api/reference-checks/[id]/report] failed to persist AI insights:", err);
        }
      }
    }
    const pdfBytes = await generateReferenceCheckReportPdf(data, aiInsights);
    const filename = `Reference Check Report - ${data.candidateName} (${data.refId}).pdf`.replace(/[/\\]/g, "-");

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[api/reference-checks/[id]/report] failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
