// Called every Monday by netlify/functions/ips-weekly-summary.mts. Public
// to middleware (the /api/cron/ prefix) and authenticated here with the
// CRON_SECRET bearer token instead of a Supabase session.
import { NextRequest, NextResponse } from "next/server";
import { sendIpsWeeklySummary } from "@/lib/roles/ips-weekly-summary";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await sendIpsWeeklySummary();
    return NextResponse.json(result, { status: result.ok ? 200 : result.error === "no_webhook" ? 409 : 502 });
  } catch (err) {
    console.error("[api/cron/ips-weekly-summary] failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
