// Streams a Penda-branded PDF report for one work trial. Dashboard-only
// (Supabase session required) — this is a superset of what the work trials
// board already shows any signed-in viewer, so no extra role check beyond
// "signed in" is needed (matches the board's own read access).
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadWorkTrialReportData } from "@/lib/reports/work-trial-report";
import { generateWorkTrialReportPdf } from "@/lib/reports/work-trial-report-pdf";

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  try {
    const data = await loadWorkTrialReportData(params.id);
    if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });

    // A report only makes sense once a real result exists — "Pending" means
    // an Incharge submitted but the BM hasn't approved yet, so there's no
    // final pass/fail to report on.
    if (data.total === null || data.passFail === "Pending") {
      return NextResponse.json({ error: "not_complete" }, { status: 409 });
    }

    const pdfBytes = await generateWorkTrialReportPdf(data);
    const filename = `Work Trial Report - ${data.candidateName} (${data.wtId}).pdf`.replace(/[/\\]/g, "-");

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[api/work-trials/[id]/report] failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
