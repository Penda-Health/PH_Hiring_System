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
import { ShieldCheck } from "lucide-react";
import { RefereeFields } from "./new-reference-check-dialog";

interface Props {
  refCheck: ReferenceCheck;
  candidateName: string;
  onVerify: (
    id: string,
    referee1: { name: string; email: string; phone: string },
    referee2: { name: string; email: string; phone: string }
  ) => Promise<void>;
}

export function VerifyReferenceCheckDialog({ refCheck, candidateName, onVerify }: Props) {
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [ref1, setRef1] = React.useState({
    name: refCheck.referee1.name,
    email: refCheck.referee1.email,
    phone: refCheck.referee1.phone,
  });
  const [ref2, setRef2] = React.useState({
    name: refCheck.referee2.name,
    email: refCheck.referee2.email,
    phone: refCheck.referee2.phone,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ref1.name || !ref2.name) return;
    setSaving(true);
    try {
      await onVerify(refCheck.id, ref1, ref2);
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
          <RefereeFields label="Referee 1" value={ref1} onChange={setRef1} />
          <RefereeFields label="Referee 2" value={ref2} onChange={setRef2} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              type="submit"
              disabled={saving || !ref1.name || !ref2.name}
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
