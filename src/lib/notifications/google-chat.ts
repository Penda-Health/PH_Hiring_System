// Server-only. Posts to a Google Chat space through its incoming webhook
// (Space → Apps & integrations → Webhooks). Unlike the Reference Checks
// "Ready for Offer" message (an Airtable automation script, SETUP.md
// §4.5.6), requisition messages are sent from the app itself, so the
// webhook URL lives in App Settings and is editable from /settings.

const GOOGLE_CHAT_WEBHOOK_PREFIX = "https://chat.googleapis.com/";

/** Only real Google Chat webhooks are accepted, so a saved setting can't point the server at an arbitrary URL. */
export function isGoogleChatWebhookUrl(url: string): boolean {
  return url.startsWith(GOOGLE_CHAT_WEBHOOK_PREFIX);
}

/**
 * Best-effort: returns false (and logs) on any failure instead of throwing,
 * because a chat message is a side effect of an approval, never a reason to
 * fail one. `threadKey` groups every message about the same requisition into
 * one thread in the space.
 */
export async function postToGoogleChat(
  webhookUrl: string | null | undefined,
  text: string,
  threadKey?: string
): Promise<boolean> {
  if (!webhookUrl || !isGoogleChatWebhookUrl(webhookUrl)) return false;
  try {
    const url = new URL(webhookUrl);
    if (threadKey) {
      url.searchParams.set("threadKey", threadKey);
      url.searchParams.set("messageReplyOption", "REPLY_MESSAGE_FALLBACK_TO_NEW_THREAD");
    }
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error("[google-chat] webhook failed:", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[google-chat] webhook request failed:", err);
    return false;
  }
}
