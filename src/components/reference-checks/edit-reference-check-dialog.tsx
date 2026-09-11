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
import { Pencil } from "lucide-react";
import { RefereeFields } from "./new-reference-check-dialog";

interface Props {
  refCheck: ReferenceCheck;
  onSave: (id: string, patch: Partial<ReferenceCheck>) => void;
}

export function EditReferenceCheckDialog({ refCheck, onSave }: Props) {
  const [open, setOpen] = React.useState(false);
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

  // Re-sync from the latest record whenever the dialog opens, so a stale
  // edit from before a background refresh never overwrites newer data.
  React.useEffect(() => {
    if (open) {
      setRef1({ name: refCheck.referee1.name, email: refCheck.referee1.email, phone: refCheck.referee1.phone });
      setRef2({ name: refCheck.referee2.name, email: refCheck.referee2.email, phone: refCheck.referee2.phone });
    }
  }, [open, refCheck]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ref1.name || !ref2.name) return;
    onSave(refCheck.id, {
      referee1: { ...refCheck.referee1, ...ref1 },
      referee2: { ...refCheck.referee2, ...ref2 },
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
          <RefereeFields label="Referee 1" value={ref1} onChange={setRef1} />
          <RefereeFields label="Referee 2" value={ref2} onChange={setRef2} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              type="submit"
              disabled={!ref1.name || !ref2.name}
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
