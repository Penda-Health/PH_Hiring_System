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
import { BranchMultiSelect } from "./branch-multi-select";

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

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
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
        <Button className="bg-penda-blue hover:bg-penda-blue-dark">Add Locum</Button>
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
            <BranchMultiSelect
              branches={branches}
              selected={form.selectedBranches}
              onChange={(next) => update("selectedBranches", next)}
            />
          </Field>

          <DialogFooter>
            <Button type="submit" disabled={submitting} className="bg-penda-blue hover:bg-penda-blue-dark">
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
