"use client";

// Resends a referee-check invite to exactly one referee on this card — e.g.
// to fix a typo'd email — without touching the other referees. "Resend"
// here means clearing that referee's emailSent/smsSent flags: there's no
// in-app send step, so the external Airtable automation (SETUP.md §4.5.2)
// picks the cleared flag up on its next run and sends the invite itself.
import * as React from "react";
import { ReferenceCheck } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Check, ChevronRight, Send } from "lucide-react";

interface Props {
  refCheck: ReferenceCheck;
  candidateName: string;
  onSave: (id: string, patch: Partial<ReferenceCheck>) => void;
}

type Step = "pick" | "edit" | "done";

export function ResendRefereeDialog({ refCheck, candidateName, onSave }: Props) {
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState<Step>("pick");
  const [selectedIdx, setSelectedIdx] = React.useState<number | null>(null);
  const [emailDraft, setEmailDraft] = React.useState("");
  const [phoneDraft, setPhoneDraft] = React.useState("");

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      setStep("pick");
      setSelectedIdx(null);
    }
  }

  function pickReferee(idx: number) {
    const referee = refCheck.referees[idx];
    setSelectedIdx(idx);
    setEmailDraft(referee.email);
    setPhoneDraft(referee.phone);
    setStep("edit");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedIdx === null || !emailDraft) return;
    onSave(refCheck.id, {
      referees: refCheck.referees.map((r, idx) => {
        if (idx !== selectedIdx) return r;
        return {
          ...r,
          email: emailDraft,
          phone: phoneDraft,
          ...(emailDraft !== r.email ? { emailSent: false } : {}),
          ...(phoneDraft !== r.phone ? { smsSent: false } : {}),
        };
      }),
    });
    setStep("done");
  }

  const selectedReferee = selectedIdx !== null ? refCheck.referees[selectedIdx] : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7 shrink-0"
        title="Resend to a referee"
        onClick={() => setOpen(true)}
      >
        <Send className="h-3.5 w-3.5" />
      </Button>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {step === "edit" && (
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-6 w-6 shrink-0 -ml-1"
                onClick={() => setStep("pick")}
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </Button>
            )}
            <div>
              <DialogTitle>
                {step === "pick" && "Choose a referee"}
                {step === "edit" && "Confirm email & resend"}
                {step === "done" && "Resend queued"}
              </DialogTitle>
              {step !== "done" && <p className="text-xs text-muted-foreground">{candidateName} · {refCheck.refId}</p>}
            </div>
          </div>
        </DialogHeader>

        {step === "pick" && (
          <div className="space-y-2 py-2">
            <p className="text-xs text-muted-foreground">Select which referee should get a fresh invite.</p>
            {refCheck.referees.map((referee, idx) => (
              <button
                key={idx}
                type="button"
                disabled={referee.responded}
                onClick={() => pickReferee(idx)}
                className="flex w-full items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-left disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{referee.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{referee.email}</span>
                </span>
                {referee.responded ? (
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                    Responded
                  </span>
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </button>
            ))}
          </div>
        )}

        {step === "edit" && selectedReferee && (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <p className="text-sm font-medium">{selectedReferee.name}</p>
            <div className="space-y-1.5">
              <Label className="text-xs">Email address</Label>
              <Input
                type="email"
                required
                value={emailDraft}
                onChange={(e) => setEmailDraft(e.target.value)}
                placeholder="referee@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Phone (optional)</Label>
              <Input value={phoneDraft} onChange={(e) => setPhoneDraft(e.target.value)} />
            </div>
            <p className="text-xs text-muted-foreground">
              We&apos;ll re-queue their reference-check invite with this email. It can take a few minutes for the
              automation to send it.
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setStep("pick")}>
                Back
              </Button>
              <Button type="submit" disabled={!emailDraft} className="bg-penda-blue hover:bg-penda-blue-dark text-white">
                Save & resend
              </Button>
            </DialogFooter>
          </form>
        )}

        {step === "done" && selectedReferee && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-success-bg text-success-fg">
              <Check className="h-5 w-5" />
            </div>
            <p className="text-sm text-muted-foreground">
              {selectedReferee.name} will get a fresh invite at <span className="font-medium text-foreground">{emailDraft}</span> within a
              few minutes.
            </p>
            <Button onClick={() => setOpen(false)} className="bg-penda-blue hover:bg-penda-blue-dark text-white">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
