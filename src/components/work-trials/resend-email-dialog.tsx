"use client";

import * as React from "react";
import { Branch, Candidate, WorkTrial } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type ResendRecipient = "BM" | "Escalation" | "Candidate";

const OPTIONS: { value: ResendRecipient; label: string; hint: string }[] = [
  { value: "BM", label: "Branch manager", hint: "Scoring link for the BM / Incharge" },
  { value: "Escalation", label: "Escalation", hint: "Scoring link to someone else, such as the RM" },
  { value: "Candidate", label: "Candidate", hint: "Confirmation link with the trial details" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function ResendEmailDialog({
  trial,
  candidate,
  branch,
  open,
  onOpenChange,
}: {
  trial: WorkTrial;
  candidate: Candidate | undefined;
  branch: Branch | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [recipient, setRecipient] = React.useState<ResendRecipient>("BM");
  const [email, setEmail] = React.useState("");
  const [note, setNote] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [result, setResult] = React.useState<{ ok: boolean; text: string } | null>(null);

  const defaultFor = React.useCallback(
    (r: ResendRecipient) => (r === "BM" ? branch?.bmEmail ?? "" : r === "Candidate" ? candidate?.email ?? "" : ""),
    [branch, candidate]
  );

  React.useEffect(() => {
    if (!open) return;
    setRecipient("BM");
    setEmail(defaultFor("BM"));
    setNote("");
    setResult(null);
  }, [open, defaultFor]);

  function pick(r: ResendRecipient) {
    setRecipient(r);
    setEmail(defaultFor(r));
    setResult(null);
  }

  const trimmed = email.trim();
  const valid = EMAIL_RE.test(trimmed);

  async function send() {
    setSending(true);
    setResult(null);
    try {
      const res = await fetch(`/api/work-trials/${trial.id}/resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient, email: trimmed, note: note.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Couldn't send the email.");
      setResult({ ok: true, text: `Email queued to ${data.to ?? trimmed}. It usually arrives within a minute.` });
    } catch (err) {
      setResult({ ok: false, text: err instanceof Error ? err.message : "Couldn't send the email." });
    } finally {
      setSending(false);
    }
  }

  const who = candidate?.name ?? "this candidate";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Resend work trial email</DialogTitle>
          <DialogDescription>
            {who}
            {branch ? ` · ${branch.name}` : ""}
            {trial.date ? ` · ${new Date(`${trial.date.slice(0, 10)}T00:00:00`).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Send to</Label>
            <div className="grid grid-cols-3 gap-2">
              {OPTIONS.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => pick(o.value)}
                  className={cn(
                    "rounded-md border px-2 py-2 text-sm transition-colors",
                    recipient === o.value
                      ? "border-penda-blue bg-penda-blue-light text-penda-blue-dark font-medium"
                      : "hover:bg-muted"
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{OPTIONS.find((o) => o.value === recipient)?.hint}</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="resend-email">Email address</Label>
            <Input
              id="resend-email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setResult(null);
              }}
              placeholder={recipient === "Escalation" ? "name@pendahealth.com" : "Enter an email address"}
              autoFocus={recipient === "Escalation"}
            />
            {recipient !== "Escalation" && !defaultFor(recipient) && (
              <p className="text-xs text-high-fg">
                No {recipient === "BM" ? "BM email for this branch" : "email for this candidate"} on file. Type one in.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="resend-note">Note (optional)</Label>
            <Textarea
              id="resend-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={1000}
              placeholder={recipient === "Escalation" ? "Why this is being escalated" : "Added to the email"}
            />
          </div>

          {result && (
            <p
              className={cn(
                "rounded-md border px-2 py-1.5 text-sm",
                result.ok ? "border-success/30 bg-success/10 text-success" : "border-destructive/20 bg-destructive/5 text-destructive"
              )}
            >
              {result.text}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {result?.ok ? "Close" : "Cancel"}
          </Button>
          <Button onClick={send} disabled={!valid || sending} className="bg-penda-blue hover:bg-penda-blue-dark">
            {sending ? "Sending…" : result?.ok ? "Send again" : "Send email"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
