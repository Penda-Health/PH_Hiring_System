"use client";

import * as React from "react";
import { Reliever } from "@/types";
import { RELIEVER_CADRES, branchClusters, standaloneBranches } from "@/lib/mock-data/clusters";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function NewRelieverDialog({ onCreate }: { onCreate: (reliever: Reliever) => Promise<void> }) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    role: RELIEVER_CADRES[0],
    phone: "",
    availabilityDates: "",
    branches: [] as string[],
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleBranch(branch: string) {
    setForm((prev) => ({
      ...prev,
      branches: prev.branches.includes(branch)
        ? prev.branches.filter((b) => b !== branch)
        : [...prev.branches, branch],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const reliever: Reliever = {
      id: `rel-${Date.now()}`, // Reliever ID field is assigned by the server on create
      name: form.name,
      role: form.role,
      branchesCovered: form.branches,
      availabilityDates: form.availabilityDates,
      status: "Active",
      phone: form.phone,
    };
    setSubmitting(true);
    try {
      await onCreate(reliever);
      setOpen(false);
      setForm({ name: "", role: RELIEVER_CADRES[0], phone: "", availabilityDates: "", branches: [] });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-penda-teal hover:bg-penda-teal-dark">Add Reliever</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Reliever</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Name">
            <Input value={form.name} onChange={(e) => update("name", e.target.value)} required />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Cadre">
              <Select value={form.role} onValueChange={(v) => update("role", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RELIEVER_CADRES.map((cadre) => (
                    <SelectItem key={cadre} value={cadre}>
                      {cadre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} required />
            </Field>
          </div>

          <Field label="Availability">
            <Input
              value={form.availabilityDates}
              onChange={(e) => update("availabilityDates", e.target.value)}
              placeholder="Jun 22 - Jul 5, 2026"
              required
            />
          </Field>

          <Field label="Branches Covered">
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {branchClusters.map((cluster) => (
                <div key={cluster.id}>
                  <p className="text-xs font-medium text-muted-foreground mb-1">{cluster.name}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {cluster.branches.map((branch) => (
                      <label key={branch} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={form.branches.includes(branch)}
                          onChange={() => toggleBranch(branch)}
                          className="h-4 w-4 rounded border-border accent-penda-teal"
                        />
                        {branch}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Standalone</p>
                <div className="grid grid-cols-2 gap-2">
                  {standaloneBranches.map((branch) => (
                    <label key={branch} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.branches.includes(branch)}
                        onChange={() => toggleBranch(branch)}
                        className="h-4 w-4 rounded border-border accent-penda-teal"
                      />
                      {branch}
                    </label>
                  ))}
                </div>
              </div>
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
