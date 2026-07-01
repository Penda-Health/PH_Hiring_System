"use client";

import * as React from "react";
import { Candidate, CandidateStage, EmploymentType, OpenRole, Segment } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
const EMPLOYMENT_TYPES: EmploymentType[] = ["Full-time", "Part-time", "Contract", "Reliever", "Locum"];
const SEGMENTS: Segment[] = ["IPS", "SO"];

function rolesScopedTo(roles: OpenRole[], segment: Segment, department?: string): OpenRole[] {
  return roles.filter((r) => r.segment === segment && (!department || r.department === department));
}

function departmentsFor(roles: OpenRole[], segment: Segment): string[] {
  return Array.from(new Set(rolesScopedTo(roles, segment).map((r) => r.department))).sort();
}

export function EditCandidateDialog({
  candidate,
  openRoles,
  onOpenChange,
  onSave,
}: {
  candidate: Candidate | null;
  openRoles: OpenRole[];
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, patch: Partial<Candidate>) => void;
}) {
  const linkedRole = candidate ? openRoles.find((r) => r.id === candidate.roleId) : undefined;

  const [form, setForm] = React.useState({
    name: "",
    phone: "",
    email: "",
    gender: "Female" as "Male" | "Female",
    employmentType: "Full-time" as EmploymentType,
    source: "",
    stage: "First Interview" as CandidateStage,
    segment: "IPS" as Segment,
    department: "",
    roleId: "",
  });
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!candidate) return;
    const role = openRoles.find((r) => r.id === candidate.roleId);
    setForm({
      name: candidate.name,
      phone: candidate.phone,
      email: candidate.email,
      gender: candidate.gender,
      employmentType: candidate.employmentType,
      source: candidate.source,
      stage: candidate.stage,
      segment: (role?.segment ?? "IPS") as Segment,
      department: role?.department ?? "",
      roleId: candidate.roleId,
    });
  }, [candidate, openRoles]);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateSegment(segment: Segment) {
    const depts = departmentsFor(openRoles, segment);
    const department = depts[0] ?? "";
    const roleId = rolesScopedTo(openRoles, segment, department)[0]?.id ?? "";
    setForm((prev) => ({ ...prev, segment, department, roleId }));
  }

  function updateDepartment(department: string) {
    const roleId = rolesScopedTo(openRoles, form.segment, department)[0]?.id ?? "";
    setForm((prev) => ({ ...prev, department, roleId }));
  }

  const departments = departmentsFor(openRoles, form.segment);
  const rolesInScope = rolesScopedTo(openRoles, form.segment, form.department);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!candidate) return;
    setSaving(true);
    try {
      const patch: Partial<Candidate> = {
        name: form.name,
        phone: form.phone,
        email: form.email,
        gender: form.gender,
        employmentType: form.employmentType,
        source: form.source,
        stage: form.stage,
        roleId: form.roleId,
        ...(form.stage !== candidate.stage ? { stageEnteredAt: new Date().toISOString() } : {}),
      };
      onSave(candidate.id, patch);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={!!candidate} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        {candidate && (
          <>
            <DialogHeader>
              <DialogTitle>Edit {candidate.name || "Candidate"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSave} className="space-y-4">
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
                      {EMPLOYMENT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Source">
                  <Input value={form.source} onChange={(e) => update("source", e.target.value)} />
                </Field>
                <Field label="Stage">
                  <Select value={form.stage} onValueChange={(v) => update("stage", v as CandidateStage)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STAGES.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <div className="rounded-md border border-border p-3 space-y-3">
                <p className="text-xs font-medium text-muted-foreground">
                  Linked Role
                  {linkedRole && form.roleId !== candidate.roleId && (
                    <span className="ml-2 text-penda-teal">· changing</span>
                  )}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Segment">
                    <Select value={form.segment} onValueChange={(v) => updateSegment(v as Segment)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SEGMENTS.map((s) => (
                          <SelectItem key={s} value={s}>{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                  <Field label="Department">
                    <Select value={form.department || undefined} onValueChange={updateDepartment}>
                      <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                      <SelectContent>
                        {departments.map((d) => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field label="Role">
                  <Select value={form.roleId} onValueChange={(v) => update("roleId", v)}>
                    <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
                    <SelectContent>
                      {rolesInScope.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.title} · {role.location}
                        </SelectItem>
                      ))}
                      {rolesInScope.length === 0 && (
                        <SelectItem value={form.roleId || "_none"} disabled>
                          No open roles in this department
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} className="bg-penda-teal hover:bg-penda-teal-dark">
                  {saving ? "Saving…" : "Save changes"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
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
