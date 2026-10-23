// Downloads the filtered roles report (Open Roles Register → "Download
// report") as a PDF or CSV. GET with repeated query params
// (?segment=IPS&status=Open&status=On%20Hold&format=pdf…) so any signed-in
// user can download it — non-GET /api/open-roles requests are editor-only.
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loadRoleSummaryRows } from "@/lib/roles/role-updates";
import { filterRoleSummaryRows, sortRoleSummaryRows, type RoleSummaryFilters } from "@/lib/roles/role-summary";
import { buildRolesReportCsv, generateRolesReportPdf, type RolesReportOptions } from "@/lib/reports/roles-report";
import type { Priority, RoleStatus, Segment } from "@/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "not_configured" }, { status: 503 });
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const q = request.nextUrl.searchParams;
  const all = (key: string) => q.getAll(key).filter(Boolean);
  const date = (key: string) => {
    const v = q.get(key);
    return v && DATE_RE.test(v) ? v : undefined;
  };
  const filters: RoleSummaryFilters = {
    segments: all("segment") as Segment[],
    statuses: all("status") as RoleStatus[],
    priorities: all("priority") as Priority[],
    departments: all("department"),
    locations: all("location"),
    recruiters: all("recruiter"),
    postedFrom: date("postedFrom"),
    postedTo: date("postedTo"),
  };
  const opts: RolesReportOptions = {
    includePipeline: q.get("pipeline") !== "0",
    includeUpdates: q.get("updates") !== "0",
    updatesPerRole: Math.min(10, Math.max(1, Number(q.get("updatesPerRole")) || 3)),
  };
  const format = q.get("format") === "csv" ? "csv" : "pdf";

  try {
    const now = new Date();
    const rows = sortRoleSummaryRows(filterRoleSummaryRows(await loadRoleSummaryRows(now), filters));
    const stamp = now.toISOString().slice(0, 10);

    if (format === "csv") {
      return new NextResponse(buildRolesReportCsv(rows, opts), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="roles-report-${stamp}.csv"`,
        },
      });
    }
    const pdf = await generateRolesReportPdf(rows, filters, opts, now);
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="roles-report-${stamp}.pdf"`,
      },
    });
  } catch (err) {
    console.error("[api/open-roles/report] failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
