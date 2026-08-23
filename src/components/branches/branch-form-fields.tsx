"use client";

import { Branch, Segment } from "@/types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// Shared by NewBranchDialog and EditBranchDialog so the two forms can't
// drift apart on which fields exist / how they're validated. Split out
// specifically because the "Active" / "Work Trial Active" / "Expansion
// Branch" checkboxes here are the exact fields that silently going unset
// caused Kinoo to disappear from every branch-filtered view in the app (see
// SETUP.md 4.9) — having one editable form for both create and edit means a
// fix to how these render/validate only has to happen in one place.
export function BranchFormFields({
  form,
  set,
  /** Edit mode locks the branch code — it's a stable identifier other data may reference by convention; renaming it after creation risks confusion, not breakage, but there's no legitimate reason to. */
  lockBranchId,
}: {
  form: Branch;
  set: <K extends keyof Branch>(k: K, v: Branch[K]) => void;
  lockBranchId?: boolean;
}) {
  return (
    <>
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
              <span className="text-xs font-normal">{seg === "IPS" ? "In-Patient Services" : "Support Office"}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Branch ID + Name ─────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Branch ID</Label>
          <Input value={form.branchId} onChange={(e) => set("branchId", e.target.value)} disabled={lockBranchId} required />
        </div>
        <div className="space-y-1.5">
          <Label>Name</Label>
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Kinoo" required />
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
          <Input value={form.regionalManager} onChange={(e) => set("regionalManager", e.target.value)} required />
        </div>
      </div>

      {/* ── BM contact ─────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>BM Email</Label>
          <Input type="email" value={form.bmEmail} onChange={(e) => set("bmEmail", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>BM Phone</Label>
          <Input value={form.bmPhone} onChange={(e) => set("bmPhone", e.target.value)} />
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
          <span className="text-xs font-normal text-muted-foreground">(unchecked = hidden from every branch-filtered view)</span>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.workTrialActive}
            onChange={(e) => set("workTrialActive", e.target.checked)}
            className="h-4 w-4 rounded border-input"
          />
          Work Trial Active
          <span className="text-xs font-normal text-muted-foreground">(shows on the public /work-trial booking form)</span>
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
    </>
  );
}
