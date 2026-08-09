"use client";

import * as React from "react";
import { Reliever } from "@/types";
import { RELIEVER_CADRES } from "@/lib/mock-data/clusters";
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

export function NewRelieverDialog({
  onCreate,
}: {
  onCreate: (reliever: Reliever) => Promise<void>;
}) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    role: RELIEVER_CADRES[0],
    phone: "",
    email: "",
    startDate: "",
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const reliever: Reliever = {
      id: `rel-${Date.now()}`,
      name: form.name,
      role: form.role,
      branchesCovered: [],
      startDate: form.startDate || undefined,
      email: form.email || undefined,
      status: "Active",
      phone: form.phone,
    };
    setSubmitting(true);
    try {
      await onCreate(reliever);
      setOpen(false);
      setForm({ name: "", role: RELIEVER_CADRES[0], phone: "", email: "", startDate: "" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-penda-blue hover:bg-penda-blue-dark">Add Reliever</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Reliever</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Name">
            <Input value={form.name} onChange={(e) => update("name", e.target.value)} required placeholder="Full name" />
          </Field>

          <Field label="Role Function">
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

          <div className="grid grid-cols-2 gap-4">
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} required placeholder="+2547…" />
            </Field>
            <Field label="Start Date">
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => update("startDate", e.target.value)}
              />
            </Field>
          </div>

          <Field label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="work or personal email"
            />
          </Field>

          <p className="text-xs text-muted-foreground rounded-md border border-border bg-muted/40 px-3 py-2">
            Branch assignment can be done later from the Reliever Pool once a deployment is confirmed.
          </p>

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
