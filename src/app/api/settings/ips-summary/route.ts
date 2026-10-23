// "Send summary now" on Settings → IPS weekly summary. Recruitment Manager
// only via the /api/settings prefix in ROLE_ROUTES. Uses the URL typed into
// the card when given (so it can be tried before saving), else the saved one.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isGoogleChatWebhookUrl } from "@/lib/notifications/google-chat";
import { sendIpsWeeklySummary } from "@/lib/roles/ips-weekly-summary";

const bodySchema = z.object({ webhookUrl: z.string().trim().max(2000).optional() });

export async function POST(request: NextRequest) {
  const result = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!result.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  const webhookUrl = result.data.webhookUrl || undefined;
  if (webhookUrl && !isGoogleChatWebhookUrl(webhookUrl)) {
    return NextResponse.json({ error: "invalid_webhook_url" }, { status: 400 });
  }
  try {
    const sent = await sendIpsWeeklySummary(webhookUrl);
    return NextResponse.json(sent, { status: sent.ok ? 200 : sent.error === "no_webhook" ? 409 : 502 });
  } catch (err) {
    console.error("[api/settings/ips-summary] failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
