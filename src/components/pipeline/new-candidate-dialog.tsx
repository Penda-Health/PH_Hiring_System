"use client";

import * as React from "react";
import { Candidate, CandidateStage, EmploymentType, Locum, Reliever, Segment } from "@/types";
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
import { RELIEVER_CADRES } from "@/lib/mock-data/clusters";
import { departmentOptionsFor } from "@/lib/department-options";

type AddType = "Candidate" | "Reliever" | "Locum";

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
  onCreateReliever,
  onCreateLocum,
}: {
  onCreate: (candidate: Candidate) => Promise<void>;
  onCreateReliever?: (reliever: Reliever) => Promise<void>;
  onCreateLocum?: (locum: Locum) => Promise<void>;
}) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [addType, setAddType] = React.useState<AddType>("Candidate");

  const [candForm, setCandForm] = React.useState(() => ({
    name: "", phone: "", email: "",
    gender: "Female" as "Male" | "Female",
    segment: "IPS" as Segment,
    department: departmentOptionsFor("IPS")[0] as string,
    stage: "First Interview" as CandidateStage,
    source: "",
    employmentType: "Full-time" as EmploymentType,
  }));

  const [relieverForm, setRelieverForm] = React.useState({
    name: "",
    phone: "",
    email: "",
    role: RELIEVER_CADRES[0],
    startDate: "",
  });

  const [locumForm, setLocumForm] = React.useState({
    name: "", phone: "",
    speciality: "",
    licenseNumber: "",
    dailyRate: "",
    availability: "",
  });

  function updateCand<K extends keyof typeof candForm>(key: K, value: (typeof candForm)[K]) {
    setCandForm((prev) => ({ ...prev, [key]: value }));
  }
  function updateCandSegment(segment: Segment) {
    setCandForm((prev) => ({ ...prev, segment, department: departmentOptionsFor(segment)[0] ?? "" }));
  }
  function updateCandDept(department: string) {
    setCandForm((prev) => ({ ...prev, department }));
  }

  function updateReliever<K extends keyof typeof relieverForm>(key: K, value: (typeof relieverForm)[K]) {
    setRelieverForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateLocum<K extends keyof typeof locumForm>(key: K, value: (typeof locumForm)[K]) {
    setLocumForm((prev) => ({ ...prev, [key]: value }));
  }

  const departments = departmentOptionsFor(candForm.segment);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      if (addType === "Reliever" && onCreateReliever) {
        await onCreateReliever({
          id: `rel-${Date.now()}`,
          name: relieverForm.name,
          role: relieverForm.role,
          phone: relieverForm.phone,
          email: relieverForm.email || undefined,
          branchesCovered: [],
          startDate: relieverForm.startDate || undefined,
          status: "Active",
        });
        setRelieverForm({ name: "", phone: "", email: "", role: RELIEVER_CADRES[0], startDate: "" });
      } else if (addType === "Locum" && onCreateLocum) {
        await onCreateLocum({
          id: `loc-${Date.now()}`,
          name: locumForm.name,
          speciality: locumForm.speciality,
          branchesCovered: [],
          dailyRate: Number(locumForm.dailyRate),
          licenseNumber: locumForm.licenseNumber,
          availability: locumForm.availability,
        });
        setLocumForm({ name: "", phone: "", speciality: "", licenseNumber: "", dailyRate: "", availability: "" });
      } else {
        const now = new Date().toISOString();
        await onCreate({
          id: `cand-${Date.now()}`,
          candId: "",
          name: candForm.name,
          phone: candForm.phone,
          email: candForm.email,
          segment: candForm.segment,
          department: candForm.department,
          stage: candForm.stage,
          source: candForm.source,
          gender: candForm.gender,
          employmentType: candForm.employmentType,
          stageEnteredAt: now,
          createdAt: now,
        });
        setCandForm((prev) => ({ ...prev, name: "", phone: "", email: "", source: "", stage: "First Interview" }));
      }
      setOpen(false);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const submitLabel =
    submitting ? "Adding…"
    : addType === "Reliever" ? "Add to Reliever Pool"
    : addType === "Locum" ? "Add to Locum Pool"
    : "Add to Pipeline";

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

          {/* Type selector */}
          <Field label="Type">
            <div className="flex gap-0.5 rounded-md border border-border p-0.5">
              {(["Candidate", "Reliever", "Locum"] as AddType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setAddType(t)}
                  className={`flex-1 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors ${
                    addType === t ? "bg-penda-blue text-white" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </Field>

          {/* ── CANDIDATE ── */}
          {addType === "Candidate" && (
            <>
              <Field label="Name">
                <Input value={candForm.name} onChange={(e) => updateCand("name", e.target.value)} required />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Phone">
                  <Input value={candForm.phone} onChange={(e) => updateCand("phone", e.target.value)} required />
                </Field>
                <Field label="Email">
                  <Input type="email" value={candForm.email} onChange={(e) => updateCand("email", e.target.value)} required />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Segment">
                  <Select value={candForm.segment} onValueChange={(v) => updateCandSegment(v as Segment)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SEGMENTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Department / Function">
                  <Select value={candForm.department || undefined} onValueChange={updateCandDept}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <p className="text-xs text-muted-foreground bg-muted rounded-md px-3 py-2">
                Role will be assigned when the candidate is moved to Hired.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Gender">
                  <Select value={candForm.gender} onValueChange={(v) => updateCand("gender", v as "Male" | "Female")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Female">Female</SelectItem>
                      <SelectItem value="Male">Male</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Employment Type">
                  <Select value={candForm.employmentType} onValueChange={(v) => updateCand("employmentType", v as EmploymentType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EMPLOYMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Starting Stage">
                  <Select value={candForm.stage} onValueChange={(v) => updateCand("stage", v as CandidateStage)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Source">
                  <Select value={candForm.source} onValueChange={(v) => updateCand("source", v)} required>
                    <SelectTrigger><SelectValue placeholder="Select source" /></SelectTrigger>
                    <SelectContent>
                      {CANDIDATE_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            </>
          )}

          {/* ── RELIEVER ── */}
          {addType === "Reliever" && (
            <>
              <Field label="Name">
                <Input value={relieverForm.name} onChange={(e) => updateReliever("name", e.target.value)} required placeholder="Full name" />
              </Field>

              <Field label="Role Function">
                <Select value={relieverForm.role} onValueChange={(v) => updateReliever("role", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RELIEVER_CADRES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Phone">
                  <Input value={relieverForm.phone} onChange={(e) => updateReliever("phone", e.target.value)} required placeholder="+2547…" />
                </Field>
                <Field label="Start Date">
                  <Input
                    type="date"
                    value={relieverForm.startDate}
                    onChange={(e) => updateReliever("startDate", e.target.value)}
                  />
                </Field>
              </div>

              <Field label="Email">
                <Input
                  type="email"
                  value={relieverForm.email}
                  onChange={(e) => updateReliever("email", e.target.value)}
                  placeholder="work or personal email"
                />
              </Field>

              <p className="text-xs text-muted-foreground rounded-md border border-border bg-muted/40 px-3 py-2">
                Branch assignment can be done later from the Reliever Pool once a deployment is confirmed.
              </p>
            </>
          )}

          {/* ── LOCUM ── */}
          {addType === "Locum" && (
            <>
              <Field label="Name">
                <Input value={locumForm.name} onChange={(e) => updateLocum("name", e.target.value)} required />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Speciality / Role Function">
                  <Input value={locumForm.speciality} onChange={(e) => updateLocum("speciality", e.target.value)} placeholder="e.g. Sonography" required />
                </Field>
                <Field label="Phone">
                  <Input value={locumForm.phone} onChange={(e) => updateLocum("phone", e.target.value)} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="License Number">
                  <Input value={locumForm.licenseNumber} onChange={(e) => updateLocum("licenseNumber", e.target.value)} required />
                </Field>
                <Field label="Daily Rate (KES)">
                  <Input type="number" value={locumForm.dailyRate} onChange={(e) => updateLocum("dailyRate", e.target.value)} required />
                </Field>
              </div>

              <Field label="Availability">
                <Input
                  value={locumForm.availability}
                  onChange={(e) => updateLocum("availability", e.target.value)}
                  placeholder="Weekends, On call…"
                  required
                />
              </Field>

              <p className="text-xs text-muted-foreground rounded-md border border-border bg-muted/40 px-3 py-2">
                Branch assignment is done in the Locum Pool once a deployment is confirmed. Locums are added to the pool without a branch.
              </p>
            </>
          )}

          {submitError && (
            <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
              {submitError}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={submitting} className="bg-penda-blue hover:bg-penda-blue-dark">
              {submitLabel}
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
