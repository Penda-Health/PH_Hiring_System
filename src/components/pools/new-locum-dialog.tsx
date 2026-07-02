"use client";

import * as React from "react";
import { Branch, Locum } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function groupByRegion(branches: Branch[]): { region: string; branches: Branch[] }[] {
  const map = new Map<string, Branch[]>();
  for (const b of branches.filter((b) => b.active)) {
    const region = b.region || "Other";
    if (!map.has(region)) map.set(region, []);
    map.get(region)!.push(b);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([region, branches]) => ({ region, branches }));
}

export function NewLocumDialog({
  branches,
  onCreate,
}: {
  branches: Branch[];
  onCreate: (locum: Locum) => Promise<void>;
}) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    speciality: "",
    licenseNumber: "",
    dailyRate: "",
    availability: "",
    selectedBranches: [] as string[],
  });

  const grouped = React.useMemo(() => groupByRegion(branches), [branches]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleBranch(branchName: string) {
    setForm((prev) => ({
      ...prev,
      selectedBranches: prev.selectedBranches.includes(branchName)
        ? prev.selectedBranches.filter((b) => b !== branchName)
        : [...prev.selectedBranches, branchName],
    }));
  }

  function toggleRegion(region: string, regionBranches: Branch[]) {
    const names = regionBranches.map((b) => b.name);
    const allSelected = names.every((n) => form.selectedBranches.includes(n));
    setForm((prev) => ({
      ...prev,
      selectedBranches: allSelected
        ? prev.selectedBranches.filter((b) => !names.includes(b))
        : Array.from(new Set([...prev.selectedBranches, ...names])),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const locum: Locum = {
      id: `loc-${Date.now()}`,
      name: form.name,
      speciality: form.speciality,
      branchesCovered: form.selectedBranches,
      dailyRate: Number(form.dailyRate),
      licenseNumber: form.licenseNumber,
      availability: form.availability,
    };
    setSubmitting(true);
    try {
      await onCreate(locum);
      setOpen(false);
      setForm({ name: "", speciality: "", licenseNumber: "", dailyRate: "", availability: "", selectedBranches: [] });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-penda-teal hover:bg-penda-teal-dark">Add Locum</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Locum</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Name">
            <Input value={form.name} onChange={(e) => update("name", e.target.value)} required />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Speciality">
              <Input value={form.speciality} onChange={(e) => update("speciality", e.target.value)} required />
            </Field>
            <Field label="License Number">
              <Input value={form.licenseNumber} onChange={(e) => update("licenseNumber", e.target.value)} required />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Daily Rate (KES)">
              <Input
                type="number"
                value={form.dailyRate}
                onChange={(e) => update("dailyRate", e.target.value)}
                required
              />
            </Field>
            <Field label="Availability">
              <Input
                value={form.availability}
                onChange={(e) => update("availability", e.target.value)}
                placeholder="Weekends, On call…"
                required
              />
            </Field>
          </div>

          <Field
            label={`Branches Covered${form.selectedBranches.length > 0 ? ` (${form.selectedBranches.length} selected)` : ""}`}
          >
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1 rounded-md border border-border p-2">
              {grouped.map(({ region, branches: regionBranches }) => {
                const names = regionBranches.map((b) => b.name);
                const allSelected = names.every((n) => form.selectedBranches.includes(n));
                const someSelected = names.some((n) => form.selectedBranches.includes(n));
                return (
                  <div key={region}>
                    <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                        onChange={() => toggleRegion(region, regionBranches)}
                        className="h-3.5 w-3.5 rounded border-border accent-penda-teal"
                      />
                      {region}
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 pl-5">
                      {regionBranches.map((branch) => (
                        <label key={branch.id} className="flex items-center gap-2 text-sm cursor-pointer">
                          <input
                            type="checkbox"
                            checked={form.selectedBranches.includes(branch.name)}
                            onChange={() => toggleBranch(branch.name)}
                            className="h-4 w-4 rounded border-border accent-penda-teal"
                          />
                          {branch.name}
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
              {grouped.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-3">No branches available</p>
              )}
            </div>
          </Field>

          <DialogFooter>
            <Button type="submit" disabled={submitting} className="bg-penda-teal hover:bg-penda-teal-dark">
              {submitting ? "Adding…" : "Add to Pool"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
