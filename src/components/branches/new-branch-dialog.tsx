"use client";

import * as React from "react";
import { Branch } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { BranchFormFields } from "@/components/branches/branch-form-fields";

interface Props {
  branches: Branch[];
  onCreate: (branch: Branch) => Promise<Branch | undefined>;
  /** Pre-checks "Expansion Branch" and tweaks the trigger/heading copy for the Expansion Tracker's entry point. */
  expansionContext?: boolean;
}

// Existing branches use a sequential "BR-##" code (see scripts/add-expansion-branches.js).
// Auto-suggest the next one so whoever's creating a branch doesn't have to go
// digging through Airtable to avoid colliding with an existing code.
function nextBranchId(branches: Branch[]): string {
  let max = 0;
  for (const b of branches) {
    const m = /^BR-(\d+)$/.exec(b.branchId ?? "");
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `BR-${String(max + 1).padStart(2, "0")}`;
}

function makeEmptyForm(branchId: string, expansionContext: boolean): Branch {
  return {
    id: "",
    branchId,
    name: "",
    city: "",
    region: "",
    branchManager: "TBD",
    bmEmail: "",
    bmPhone: "",
    regionalManager: "",
    capacity: 8,
    active: true,
    workTrialActive: false,
    address: "",
    mapPinUrl: "",
    expansionBranch: expansionContext,
    segment: "IPS",
  };
}

export function NewBranchDialog({ branches, onCreate, expansionContext }: Props) {
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState<Branch>(() => makeEmptyForm(nextBranchId(branches), !!expansionContext));

  function set<K extends keyof Branch>(k: K, v: Branch[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function reset() {
    setForm(makeEmptyForm(nextBranchId(branches), !!expansionContext));
  }

  const valid =
    form.branchId.trim() &&
    form.name.trim() &&
    form.city.trim() &&
    form.region.trim() &&
    form.branchManager.trim() &&
    form.regionalManager.trim() &&
    form.capacity > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    try {
      await onCreate(form);
      setOpen(false);
      reset();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-1.5" />
          New Branch
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{expansionContext ? "Add Expansion Branch" : "Add Branch"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <BranchFormFields form={form} set={set} />

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              type="submit"
              disabled={saving || !valid}
              className="bg-penda-blue hover:bg-penda-blue-dark text-white"
            >
              {saving ? "Creating…" : "Create Branch"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
