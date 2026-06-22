"use client";

import * as React from "react";
import { Candidate, EmploymentType, OpenRole } from "@/types";
import { generateCandId } from "@/lib/pipeline-helpers";
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

const EMPLOYMENT_TYPES: EmploymentType[] = ["Full-time", "Part-time", "Contract", "Reliever", "Locum"];

export function NewCandidateDialog({
  roles,
  onCreate,
}: {
  roles: OpenRole[];
  onCreate: (candidate: Candidate) => Promise<void>;
}) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    phone: "",
    email: "",
    gender: "Female" as "Male" | "Female",
    roleId: roles[0]?.id ?? "",
    source: "",
    employmentType: "Full-time" as EmploymentType,
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const now = new Date().toISOString();
    const candidate: Candidate = {
      id: `cand-${Date.now()}`,
      candId: generateCandId(),
      name: form.name,
      phone: form.phone,
      email: form.email,
      roleId: form.roleId,
      stage: "First Interview",
      source: form.source,
      gender: form.gender,
      employmentType: form.employmentType,
      stageEnteredAt: now,
      createdAt: now,
    };
    setSubmitting(true);
    try {
      await onCreate(candidate);
      setOpen(false);
      setForm((prev) => ({ ...prev, name: "", phone: "", email: "", source: "" }));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-penda-teal hover:bg-penda-teal-dark">Add Candidate</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Candidate</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Name">
            <Input value={form.name} onChange={(e) => update("name", e.target.value)} required />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} required />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required />
            </Field>
          </div>

          <Field label="Role">
            <Select value={form.roleId} onValueChange={(v) => update("roleId", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((role) => (
                  <SelectItem key={role.id} value={role.id}>
                    {role.title} · {role.location}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Gender">
              <Select value={form.gender} onValueChange={(v) => update("gender", v as "Male" | "Female")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Male">Male</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Employment Type">
              <Select value={form.employmentType} onValueChange={(v) => update("employmentType", v as EmploymentType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Source">
            <Input
              value={form.source}
              onChange={(e) => update("source", e.target.value)}
              placeholder="SeamlessHR, Referral, LinkedIn..."
              required
            />
          </Field>

          <DialogFooter>
            <Button type="submit" disabled={submitting} className="bg-penda-teal hover:bg-penda-teal-dark">
              {submitting ? "Adding…" : "Add to Pipeline"}
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
