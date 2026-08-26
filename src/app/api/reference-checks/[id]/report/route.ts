// Streams a Penda-branded PDF report for one reference check. Dashboard-only
// (Supabase session required) — mirrors work-trials/[id]/report. Unlike the
// work-trial report, a partial report (only one referee has responded) is
// allowed and useful — the 409 only fires when neither referee has answered
// yet, i.e. there's nothing at all to report on.
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadReferenceCheckReportData } from "@/lib/reports/reference-check-report";
import { generateReferenceCheckReportPdf } from "@/lib/reports/reference-check-report-pdf";

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

    if (!data.referee1.responded && !data.referee2.responded) {
      return NextResponse.json({ error: "not_complete" }, { status: 409 });
    }

    const pdfBytes = await generateReferenceCheckReportPdf(data);
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
