"use client";

// TA reviews a candidate-submitted (unverified) reference check — corrects
// any typos in what the candidate typed, then sends. This is what actually
// moves a record from "Awaiting Verification" to "Awaiting Responses" and
// sets `initiatedAt`, the field the referee-link-sending Airtable automation
// triggers off (see SETUP.md).
import * as React from "react";
import { ReferenceCheck } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, ShieldCheck } from "lucide-react";
import { MAX_REFEREES, MIN_REFEREES, RefereeFields } from "./new-reference-check-dialog";

interface Props {
  refCheck: ReferenceCheck;
  candidateName: string;
  onVerify: (id: string, referees: { name: string; email: string; phone: string }[]) => Promise<void>;
}

export function VerifyReferenceCheckDialog({ refCheck, candidateName, onVerify }: Props) {
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [referees, setReferees] = React.useState<{ name: string; email: string; phone: string }[]>(() =>
    refCheck.referees.map((r) => ({ name: r.name, email: r.email, phone: r.phone }))
  );

  const allNamed = referees.every((r) => r.name);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allNamed) return;
    setSaving(true);
    try {
      await onVerify(refCheck.id, referees);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="w-full bg-penda-blue hover:bg-penda-blue-dark text-white">
          <ShieldCheck className="h-4 w-4 mr-1.5" />
          Verify &amp; send
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Verify referees for {candidateName}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {candidateName} submitted these details themselves. Check them over — fix any typos — then send. This is
          what emails each referee their link.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {referees.map((referee, i) => (
            <RefereeFields
              key={i}
              label={`Referee ${i + 1}`}
              value={referee}
              onChange={(v) => setReferees((prev) => prev.map((r, idx) => (idx === i ? v : r)))}
              onRemove={
                referees.length > MIN_REFEREES
                  ? () => setReferees((prev) => prev.filter((_, idx) => idx !== i))
                  : undefined
              }
            />
          ))}
          {referees.length < MAX_REFEREES && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setReferees((prev) => [...prev, { name: "", email: "", phone: "" }])}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add referee
            </Button>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              type="submit"
              disabled={saving || !allNamed}
              className="bg-penda-blue hover:bg-penda-blue-dark text-white"
            >
              {saving ? "Sending…" : "Verify & send"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
