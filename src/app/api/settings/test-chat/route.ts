// "Send test message" on Settings → Requisition approvals. Recruitment
// Manager only via the /api/settings prefix in ROLE_ROUTES. Tests the URL
// typed into the card (so it can be checked before saving), falling back to
// the saved one.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { isGoogleChatWebhookUrl, postToGoogleChat } from "@/lib/notifications/google-chat";
import { loadApprovalSettings } from "@/lib/requisitions/approval";
import { getCurrentUserIdentity } from "@/lib/supabase/server";

const bodySchema = z.object({ webhookUrl: z.string().trim().max(2000).optional() });

export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => ({}));
  const result = bodySchema.safeParse(json);
  if (!result.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const webhookUrl = result.data.webhookUrl || (await loadApprovalSettings()).chatWebhookUrl;
  if (!webhookUrl || !isGoogleChatWebhookUrl(webhookUrl)) {
    return NextResponse.json({ error: "invalid_webhook_url" }, { status: 400 });
  }

  const identity = await getCurrentUserIdentity();
  const ok = await postToGoogleChat(
    webhookUrl,
    `🔔 Test message from the Penda hiring system — requisition approval updates will post here.${identity ? ` (sent by ${identity.name})` : ""}`
  );
  return ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: "webhook_failed" }, { status: 502 });
}
