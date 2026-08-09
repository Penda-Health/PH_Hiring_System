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
import { AlertTriangle } from "lucide-react";
import { CANDIDATE_SOURCES } from "@/lib/candidate-sources";
import { departmentOptionsFor } from "@/lib/department-options";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";

/** Strip everything except digits and a leading + for phone comparison */
function normalizePhone(p: string) {
  return p.replace(/[^\d+]/g, "").replace(/^\+/, "");
}

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

type DuplicateMatch = { candidate: Candidate; reason: string };

/** Returns true if two names share ≥2 words (case-insensitive) */
function namesSimilar(a: string, b: string): boolean {
  const wordsA = a.toLowerCase().split(/\s+/).filter(Boolean);
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(Boolean));
  const shared = wordsA.filter((w) => w.length > 2 && wordsB.has(w));
  return shared.length >= 2;
}

export function NewCandidateDialog({
  onCreate,
}: {
  onCreate: (candidate: Candidate) => Promise<void>;
}) {
  const { candidates } = useRecruitmentData();
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

  // Real-time duplicate detection across phone, email, and name similarity
  const duplicates = React.useMemo<DuplicateMatch[]>(() => {
    if (!open) return [];
    const results: DuplicateMatch[] = [];
    const seen = new Set<string>();

    const phoneInput = normalizePhone(form.phone);
    const emailInput = form.email.trim().toLowerCase();
    const nameInput = form.name.trim();

    for (const c of candidates) {
      if (seen.has(c.id)) continue;
      const reasons: string[] = [];

      if (phoneInput.length >= 7 && normalizePhone(c.phone) === phoneInput) {
        reasons.push("same phone number");
      }
      if (emailInput.length > 3 && c.email && c.email.toLowerCase() === emailInput) {
        reasons.push("same email address");
      }
      if (nameInput.length >= 4 && namesSimilar(nameInput, c.name)) {
        reasons.push("similar name");
      }

      if (reasons.length > 0) {
        seen.add(c.id);
        results.push({ candidate: c, reason: reasons.join(" · ") });
      }
    }
    return results;
  }, [open, form.phone, form.email, form.name, candidates]);

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

          {/* Duplicate warning — shown as soon as a match is detected */}
          {duplicates.length > 0 && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2.5 space-y-1.5">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium">
                  {duplicates.length === 1 ? "Possible duplicate" : `${duplicates.length} possible duplicates`} found
                </span>
              </div>
              <ul className="space-y-1">
                {duplicates.map(({ candidate, reason }) => (
                  <li key={candidate.id} className="text-xs text-muted-foreground pl-6">
                    <span className="font-medium text-foreground">{candidate.name}</span>
                    {" — "}{candidate.stage}
                    {candidate.department ? ` · ${candidate.department}` : ""}
                    <span className="ml-1 text-amber-600 dark:text-amber-400">({reason})</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-muted-foreground pl-6">You can still add this candidate if they are a different person.</p>
            </div>
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
