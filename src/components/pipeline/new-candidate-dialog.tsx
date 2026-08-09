"use client";

import * as React from "react";
import { Candidate, CandidateStage, EmploymentType, Segment } from "@/types";
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
import { CANDIDATE_SOURCES } from "@/lib/candidate-sources";
import { departmentOptionsFor } from "@/lib/department-options";

const EMPLOYMENT_TYPES: EmploymentType[] = ["Full-time", "Part-time", "Contract", "Reliever", "Locum"];
const SEGMENTS: Segment[] = ["IPS", "SO"];
const STAGES: CandidateStage[] = [
  "First Interview",
  "Second Interview",
  "Panel Interview",
  "Work Trial",
  "Reference Check",
  "Offer",
  "Hired",
  "Backup Pool",
  "Rejected",
  "Withdrawn",
];

export function NewCandidateDialog({
  onCreate,
}: {
  onCreate: (candidate: Candidate) => Promise<void>;
}) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const [form, setForm] = React.useState(() => ({
    name: "", phone: "", email: "",
    gender: "Female" as "Male" | "Female",
    segment: "IPS" as Segment,
    department: departmentOptionsFor("IPS")[0] as string,
    stage: "First Interview" as CandidateStage,
    source: "",
    employmentType: "Full-time" as EmploymentType,
  }));

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }
  function updateSegment(segment: Segment) {
    setForm((prev) => ({ ...prev, segment, department: departmentOptionsFor(segment)[0] ?? "" }));
  }

  const departments = departmentOptionsFor(form.segment);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      await onCreate({
        id: `cand-${Date.now()}`,
        candId: "",
        name: form.name,
        phone: form.phone,
        email: form.email,
        segment: form.segment,
        department: form.department,
        stage: form.stage,
        source: form.source,
        gender: form.gender,
        employmentType: form.employmentType,
        stageEnteredAt: now,
        createdAt: now,
      });
      setForm((prev) => ({ ...prev, name: "", phone: "", email: "", source: "", stage: "First Interview" }));
      setOpen(false);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-penda-blue hover:bg-penda-blue-dark">Add Candidate</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Candidate</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">

          <Field label="Name">
            <Input value={form.name} onChange={(e) => update("name", e.target.value)} required placeholder="Full name" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} required placeholder="+2547…" />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Segment">
              <Select value={form.segment} onValueChange={(v) => updateSegment(v as Segment)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEGMENTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Department / Function">
              <Select value={form.department || undefined} onValueChange={(v) => update("department", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Gender">
              <Select value={form.gender} onValueChange={(v) => update("gender", v as "Male" | "Female")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Male">Male</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Employment Type">
              <Select value={form.employmentType} onValueChange={(v) => update("employmentType", v as EmploymentType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Starting Stage">
              <Select value={form.stage} onValueChange={(v) => update("stage", v as CandidateStage)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Source">
              <Select value={form.source} onValueChange={(v) => update("source", v)} required>
                <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                <SelectContent>
                  {CANDIDATE_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {(form.employmentType === "Reliever" || form.employmentType === "Locum") && (
            <p className="text-xs text-penda-blue rounded-md border border-penda-blue/30 bg-penda-blue/5 px-3 py-2">
              When this candidate is moved to <strong>Hired</strong>, they will automatically be added to the{" "}
              {form.employmentType === "Reliever" ? "Reliever Pool" : "Locum Pool"}.
            </p>
          )}

          {submitError && (
            <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
              {submitError}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={submitting} className="bg-penda-blue hover:bg-penda-blue-dark">
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
