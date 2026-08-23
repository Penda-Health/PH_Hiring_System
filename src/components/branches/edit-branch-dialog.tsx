"use client";

import * as React from "react";
import { Branch } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Pencil } from "lucide-react";
import { BranchFormFields } from "@/components/branches/branch-form-fields";

interface Props {
  branch: Branch;
  onSave: (id: string, patch: Partial<Branch>) => void;
}

// Edits an existing branch's fields in place — the counterpart to
// NewBranchDialog, which only creates new rows. Exists specifically because
// there was previously no way to fix a branch's data (e.g. a blank Active /
// Expansion Branch checkbox, which silently hid Kinoo from every
// branch-filtered view) without going into Airtable directly. See
// SETUP.md 4.9.
export function EditBranchDialog({ branch, onSave }: Props) {
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<Branch>(branch);

  // Re-sync if the branch's data changes underneath (e.g. another tab's
  // edit lands via the polling/focus refresh) while the dialog is closed.
  React.useEffect(() => {
    if (!open) setForm(branch);
  }, [branch, open]);

  function set<K extends keyof Branch>(k: K, v: Branch[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const valid =
    form.branchId.trim() &&
    form.name.trim() &&
    form.city.trim() &&
    form.region.trim() &&
    form.branchManager.trim() &&
    form.regionalManager.trim() &&
    form.capacity > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    const { id, ...patch } = form;
    void id;
    onSave(branch.id, patch);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) setForm(branch); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" className="h-7 px-2">
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit {branch.name || "Branch"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <BranchFormFields form={form} set={set} lockBranchId />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={!valid} className="bg-penda-blue hover:bg-penda-blue-dark text-white">
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
