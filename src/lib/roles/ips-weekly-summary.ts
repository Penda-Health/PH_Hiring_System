// Server-only. Posts the IPS weekly open-roles summary to the IPS
// collaboration Google Chat space. Triggered every Monday morning by the
// Netlify scheduled function (netlify/functions/ips-weekly-summary.mts →
// /api/cron/ips-weekly-summary) and on demand from Settings.
import { listRecords } from "@/lib/airtable/client";
import { TABLE_NAMES } from "@/lib/airtable/field-names";
import { appSettingsFromAirtable } from "@/lib/airtable/mappers";
import { postToGoogleChat } from "@/lib/notifications/google-chat";
import { buildIpsWeeklySummaryMessages } from "@/lib/roles/role-summary";
import { loadRoleSummaryRows } from "@/lib/roles/role-updates";

export type IpsSummaryResult =
  | { ok: true; messagesSent: number }
  | { ok: false; error: "no_webhook" | "webhook_failed" };

export async function loadIpsSummaryWebhookUrl(): Promise<string | null> {
  const [record] = await listRecords(TABLE_NAMES.AppSettings);
  return record ? appSettingsFromAirtable(record).ipsSummaryChatWebhookUrl : null;
}

export async function sendIpsWeeklySummary(webhookUrl?: string | null): Promise<IpsSummaryResult> {
  const url = webhookUrl || (await loadIpsSummaryWebhookUrl());
  if (!url) return { ok: false, error: "no_webhook" };

  const now = new Date();
  const messages = buildIpsWeeklySummaryMessages(await loadRoleSummaryRows(now), now);
  // One thread per week, so a long summary split over several messages
  // (and any replies to it) stays together in the space.
  const threadKey = `ips-weekly-${now.toISOString().slice(0, 10)}`;
  let sent = 0;
  for (const text of messages) {
    if (!(await postToGoogleChat(url, text, threadKey))) {
      return sent === 0 ? { ok: false, error: "webhook_failed" } : { ok: true, messagesSent: sent };
    }
    sent++;
  }
  return { ok: true, messagesSent: sent };
}
