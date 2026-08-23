"use client";

import * as React from "react";
import { Branch, Segment } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

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
          {/* ── Segment toggle ───────────────────────────── */}
          <div className="space-y-1.5">
            <Label>Segment</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["IPS", "SO"] as Segment[]).map((seg) => (
                <button
                  key={seg}
                  type="button"
                  onClick={() => set("segment", seg)}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-lg border px-4 py-3 text-sm font-medium transition-colors",
                    form.segment === seg
                      ? "border-penda-blue bg-penda-blue/10 text-penda-blue"
                      : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  <span className="text-base font-semibold">{seg}</span>
                  <span className="text-xs font-normal">
                    {seg === "IPS" ? "In-Patient Services" : "Support Office"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Branch ID + Name ─────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Branch ID</Label>
              <Input value={form.branchId} onChange={(e) => set("branchId", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Kinoo"
                required
              />
            </div>
          </div>

          {/* ── City + Region ─────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input value={form.city} onChange={(e) => set("city", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Region</Label>
              <Input value={form.region} onChange={(e) => set("region", e.target.value)} required />
            </div>
          </div>

          {/* ── Branch Manager + Regional Manager ─────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Branch Manager</Label>
              <Input value={form.branchManager} onChange={(e) => set("branchManager", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Regional Manager</Label>
              <Input
                value={form.regionalManager}
                onChange={(e) => set("regionalManager", e.target.value)}
                required
              />
            </div>
          </div>

          {/* ── Capacity ─────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label>Capacity</Label>
            <Input
              type="number"
              min={1}
              value={form.capacity}
              onChange={(e) => set("capacity", Number(e.target.value))}
              required
            />
          </div>

          {/* ── Flags ──────────────────────────────────────── */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => set("active", e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              Active
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.workTrialActive}
                onChange={(e) => set("workTrialActive", e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              Work Trial Active
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={!!form.expansionBranch}
                onChange={(e) => set("expansionBranch", e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              Expansion Branch
              <span className="text-xs font-normal text-muted-foreground">(shows on the Expansion Tracker)</span>
            </label>
          </div>

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
