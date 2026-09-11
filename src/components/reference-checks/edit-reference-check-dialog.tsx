"use client";

// Fixes a referee's name/email/phone after the fact (a typo, a swapped
// email, a test record that needs correcting) — the counterpart to
// VerifyReferenceCheckDialog, but usable regardless of status and without
// ever touching status/verifiedAt/initiatedAt the way verify does. See
// EditBranchDialog for the same "there was previously no way to fix this
// without going into Airtable directly" motivation.
import * as React from "react";
import { ReferenceCheck } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Pencil, Plus } from "lucide-react";
import { MAX_REFEREES, MIN_REFEREES, RefereeFields } from "./new-reference-check-dialog";

interface Props {
  refCheck: ReferenceCheck;
  onSave: (id: string, patch: Partial<ReferenceCheck>) => void;
}

function refereeInputs(refCheck: ReferenceCheck) {
  return refCheck.referees.map((r) => ({ name: r.name, email: r.email, phone: r.phone }));
}

export function EditReferenceCheckDialog({ refCheck, onSave }: Props) {
  const [open, setOpen] = React.useState(false);
  const [referees, setReferees] = React.useState(() => refereeInputs(refCheck));

  // Once links have gone out, a referee may already hold a real response —
  // removing one here would silently discard that. Adding a backup referee
  // (e.g. the original two are unresponsive) is still always allowed.
  const initiated = !!refCheck.initiatedAt;

  // Re-sync from the latest record whenever the dialog opens, so a stale
  // edit from before a background refresh never overwrites newer data.
  React.useEffect(() => {
    if (open) setReferees(refereeInputs(refCheck));
  }, [open, refCheck]);

  const allNamed = referees.every((r) => r.name);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allNamed) return;
    onSave(refCheck.id, {
      referees: referees.map((r, i) =>
        refCheck.referees[i]
          ? { ...refCheck.referees[i], ...r }
          : { ...r, emailSent: false, smsSent: false, responded: false }
      ),
    });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" title="Edit referee details">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit referee details</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {referees.map((referee, i) => (
            <RefereeFields
              key={i}
              label={`Referee ${i + 1}`}
              value={referee}
              onChange={(v) => setReferees((prev) => prev.map((r, idx) => (idx === i ? v : r)))}
              onRemove={
                !initiated && referees.length > MIN_REFEREES
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
              disabled={!allNamed}
              className="bg-penda-blue hover:bg-penda-blue-dark text-white"
            >
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
