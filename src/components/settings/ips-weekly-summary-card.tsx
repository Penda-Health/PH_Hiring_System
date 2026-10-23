"use client";

import * as React from "react";
import { AppSettings } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Message = { tone: "ok" | "error"; text: string };

export function IpsWeeklySummaryCard() {
  const [saved, setSaved] = React.useState("");
  const [webhookUrl, setWebhookUrl] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [message, setMessage] = React.useState<Message | null>(null);

  React.useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json() as Promise<AppSettings>)
      .then((data) => {
        setSaved(data.ipsSummaryChatWebhookUrl ?? "");
        setWebhookUrl(data.ipsSummaryChatWebhookUrl ?? "");
      })
      .catch(() => setMessage({ tone: "error", text: "Failed to load current setting." }))
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ipsSummaryChatWebhookUrl: webhookUrl.trim() }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as AppSettings;
      setSaved(data.ipsSummaryChatWebhookUrl ?? "");
      setWebhookUrl(data.ipsSummaryChatWebhookUrl ?? "");
      setMessage({ tone: "ok", text: data.ipsSummaryChatWebhookUrl ? "Webhook saved." : "Webhook cleared — weekly summary is off." });
    } catch {
      setMessage({ tone: "error", text: "Couldn't save. It must be a Google Chat webhook URL (https://chat.googleapis.com/…)." });
    } finally {
      setSaving(false);
    }
  }

  async function sendNow() {
    setSending(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/ips-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: webhookUrl.trim() || undefined }),
      });
      setMessage(
        res.ok
          ? { tone: "ok", text: "Summary posted — check the IPS collaboration space." }
          : res.status === 409
            ? { tone: "error", text: "Add the IPS space's webhook URL first." }
            : { tone: "error", text: "Google Chat didn't accept the message. Check the webhook URL." }
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>IPS weekly summary</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-xs text-muted-foreground">
          Every Monday at 9:00 AM, a summary of open IPS roles is posted to the IPS collaboration Google Chat space. It
          covers headcount gaps, days open, the candidate pipeline and each recruiter&apos;s latest weekly update. Paste
          the space&apos;s webhook URL (Space → Apps &amp; integrations → Webhooks). Leave it blank to switch the summary off.
        </p>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://chat.googleapis.com/v1/spaces/…"
              className="min-w-0 flex-1 basis-80"
            />
            <Button
              size="sm"
              disabled={saving || webhookUrl.trim() === saved}
              onClick={save}
              className="bg-penda-blue hover:bg-penda-blue-dark"
            >
              {saving ? "Saving…" : "Save"}
            </Button>
            <Button size="sm" variant="outline" disabled={sending || !webhookUrl.trim()} onClick={sendNow}>
              {sending ? "Sending…" : "Send summary now"}
            </Button>
          </div>
        )}
        {message && (
          <p className={`mt-2 text-xs ${message.tone === "ok" ? "text-emerald-600" : "text-destructive"}`}>{message.text}</p>
        )}
      </CardContent>
    </Card>
  );
}
