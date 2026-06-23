"use client";

import * as React from "react";
import { Locum } from "@/types";
import { coverageZones } from "@/lib/mock-data/clusters";
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

export function NewLocumDialog({ onCreate }: { onCreate: (locum: Locum) => Promise<void> }) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    speciality: "",
    licenseNumber: "",
    dailyRate: "",
    availability: "",
    zones: [] as string[],
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleZone(zone: string) {
    setForm((prev) => ({
      ...prev,
      zones: prev.zones.includes(zone) ? prev.zones.filter((z) => z !== zone) : [...prev.zones, zone],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const locum: Locum = {
      id: `loc-${Date.now()}`, // Locum ID field is assigned by the server on create
      name: form.name,
      speciality: form.speciality,
      branchesCovered: form.zones,
      dailyRate: Number(form.dailyRate),
      licenseNumber: form.licenseNumber,
      availability: form.availability,
    };
    setSubmitting(true);
    try {
      await onCreate(locum);
      setOpen(false);
      setForm({ name: "", speciality: "", licenseNumber: "", dailyRate: "", availability: "", zones: [] });
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
                placeholder="Weekends, On call..."
                required
              />
            </Field>
          </div>

          <Field label="Coverage Zones">
            <div className="grid grid-cols-2 gap-2">
              {coverageZones.map((zone) => (
                <label key={zone} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.zones.includes(zone)}
                    onChange={() => toggleZone(zone)}
                    className="h-4 w-4 rounded border-border accent-penda-teal"
                  />
                  {zone}
                </label>
              ))}
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
