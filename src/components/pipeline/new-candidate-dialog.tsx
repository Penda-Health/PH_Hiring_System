"use client";

import * as React from "react";
import { Candidate, CandidateStage, EmploymentType, OpenRole, Segment } from "@/types";
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

// Narrows the (often long) flat role list down to what's relevant for the
// currently selected segment/department, mirroring the dashboard's
// segment -> department -> role cascade so this dropdown stays manageable.
function rolesScopedTo(roles: OpenRole[], segment: Segment, department?: string): OpenRole[] {
  return roles.filter((r) => r.segment === segment && (!department || r.department === department));
}

function defaultSelection(roles: OpenRole[], segment: Segment) {
  const department = rolesScopedTo(roles, segment)[0]?.department ?? "";
  const roleId = rolesScopedTo(roles, segment, department)[0]?.id ?? "";
  return { department, roleId };
}

export function NewCandidateDialog({
  roles,
  onCreate,
}: {
  roles: OpenRole[];
  onCreate: (candidate: Candidate) => Promise<void>;
}) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [form, setForm] = React.useState(() => {
    const segment: Segment = roles[0]?.segment ?? "IPS";
    return {
      name: "",
      phone: "",
      email: "",
      gender: "Female" as "Male" | "Female",
      segment,
      ...defaultSelection(roles, segment),
      stage: "First Interview" as CandidateStage,
      source: "",
      employmentType: "Full-time" as EmploymentType,
    };
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateSegment(segment: Segment) {
    setForm((prev) => ({ ...prev, segment, ...defaultSelection(roles, segment) }));
  }

  function updateDepartment(department: string) {
    setForm((prev) => ({ ...prev, department, roleId: rolesScopedTo(roles, prev.segment, department)[0]?.id ?? "" }));
  }

  const departments = Array.from(new Set(rolesScopedTo(roles, form.segment).map((r) => r.department))).sort();
  const rolesInScope = rolesScopedTo(roles, form.segment, form.department);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const now = new Date().toISOString();
    const candidate: Candidate = {
      id: `cand-${Date.now()}`,
      candId: "", // assigned by the server on create
      name: form.name,
      phone: form.phone,
      email: form.email,
      roleId: form.roleId,
      stage: form.stage,
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
      setForm((prev) => ({ ...prev, name: "", phone: "", email: "", source: "", stage: "First Interview" }));
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

          <div className="grid grid-cols-2 gap-4">
            <Field label="Segment">
              <Select value={form.segment} onValueChange={(v) => updateSegment(v as Segment)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEGMENTS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Department / Function">
              <Select value={form.department || undefined} onValueChange={updateDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field label="Role">
            <Select value={form.roleId} onValueChange={(v) => update("roleId", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                {rolesInScope.map((role) => (
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

          <div className="grid grid-cols-2 gap-4">
            <Field label="Starting Stage">
              <Select value={form.stage} onValueChange={(v) => update("stage", v as CandidateStage)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Source">
              <Input
                value={form.source}
                onChange={(e) => update("source", e.target.value)}
                placeholder="SeamlessHR, Referral, LinkedIn..."
                required
              />
            </Field>
          </div>

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
