"use client";

import * as React from "react";
import { Branch, Candidate, CandidateStage, EmploymentType, Locum, OpenRole, Reliever, Segment } from "@/types";
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

const ASSIGNABLE_STATUSES = new Set(["Open", "On Hold", "Allocated"]);

function rolesScopedTo(roles: OpenRole[], segment: Segment, department?: string): OpenRole[] {
  return roles.filter(
    (r) => ASSIGNABLE_STATUSES.has(r.status) && r.segment === segment && (!department || r.department === department)
  );
}

function defaultSelection(roles: OpenRole[], segment: Segment) {
  const department = rolesScopedTo(roles, segment)[0]?.department ?? "";
  const roleId = rolesScopedTo(roles, segment, department)[0]?.id ?? "";
  return { department, roleId };
}

function groupByRegion(branches: Branch[]): { region: string; branches: Branch[] }[] {
  const map = new Map<string, Branch[]>();
  for (const b of branches.filter((b) => b.active)) {
    const region = b.region || "Other";
    if (!map.has(region)) map.set(region, []);
    map.get(region)!.push(b);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([region, branches]) => ({ region, branches }));
}

function BranchPicker({
  branches,
  selected,
  onToggleBranch,
  onToggleRegion,
}: {
  branches: Branch[];
  selected: string[];
  onToggleBranch: (name: string) => void;
  onToggleRegion: (region: string, regionBranches: Branch[]) => void;
}) {
  const grouped = React.useMemo(() => groupByRegion(branches), [branches]);
  return (
    <div className="space-y-3 max-h-52 overflow-y-auto pr-1 rounded-md border border-border p-2">
      {grouped.map(({ region, branches: rb }) => {
        const names = rb.map((b) => b.name);
        const allSel = names.every((n) => selected.includes(n));
        const someSel = names.some((n) => selected.includes(n));
        return (
          <div key={region}>
            <label className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 cursor-pointer">
              <input
                type="checkbox"
                checked={allSel}
                ref={(el) => { if (el) el.indeterminate = someSel && !allSel; }}
                onChange={() => onToggleRegion(region, rb)}
                className="h-3.5 w-3.5 rounded border-border accent-penda-teal"
              />
              {region}
            </label>
            <div className="grid grid-cols-2 gap-1.5 pl-5">
              {rb.map((branch) => (
                <label key={branch.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.includes(branch.name)}
                    onChange={() => onToggleBranch(branch.name)}
                    className="h-4 w-4 rounded border-border accent-penda-teal"
                  />
                  {branch.name}
                </label>
              ))}
            </div>
          </div>
        );
      })}
      {grouped.length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-3">No branches available</p>
      )}
    </div>
  );
}

export function NewCandidateDialog({
  roles,
  branches = [],
  onCreate,
  onCreateReliever,
  onCreateLocum,
}: {
  roles: OpenRole[];
  branches?: Branch[];
  onCreate: (candidate: Candidate) => Promise<void>;
  onCreateReliever?: (reliever: Reliever) => Promise<void>;
  onCreateLocum?: (locum: Locum) => Promise<void>;
}) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [addType, setAddType] = React.useState<AddType>("Candidate");

  const defaultSegment: Segment = roles[0]?.segment ?? "IPS";
  const [candForm, setCandForm] = React.useState(() => ({
    name: "", phone: "", email: "",
    gender: "Female" as "Male" | "Female",
    segment: defaultSegment,
    ...defaultSelection(roles, defaultSegment),
    stage: "First Interview" as CandidateStage,
    source: "",
    employmentType: "Full-time" as EmploymentType,
  }));

  const [relieverForm, setRelieverForm] = React.useState({
    name: "", phone: "",
    role: RELIEVER_CADRES[0],
    availabilityDates: "",
    selectedBranches: [] as string[],
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
    setCandForm((prev) => ({ ...prev, segment, ...defaultSelection(roles, segment) }));
  }
  function updateCandDept(department: string) {
    setCandForm((prev) => ({
      ...prev, department,
      roleId: rolesScopedTo(roles, prev.segment, department)[0]?.id ?? "",
    }));
  }

  function updateReliever<K extends keyof typeof relieverForm>(key: K, value: (typeof relieverForm)[K]) {
    setRelieverForm((prev) => ({ ...prev, [key]: value }));
  }
  function toggleRelieverBranch(name: string) {
    setRelieverForm((prev) => ({
      ...prev,
      selectedBranches: prev.selectedBranches.includes(name)
        ? prev.selectedBranches.filter((b) => b !== name)
        : [...prev.selectedBranches, name],
    }));
  }
  function toggleRelieverRegion(region: string, rb: Branch[]) {
    const names = rb.map((b) => b.name);
    const allSel = names.every((n) => relieverForm.selectedBranches.includes(n));
    setRelieverForm((prev) => ({
      ...prev,
      selectedBranches: allSel
        ? prev.selectedBranches.filter((b) => !names.includes(b))
        : Array.from(new Set([...prev.selectedBranches, ...names])),
    }));
  }

  function updateLocum<K extends keyof typeof locumForm>(key: K, value: (typeof locumForm)[K]) {
    setLocumForm((prev) => ({ ...prev, [key]: value }));
  }

  const departments = Array.from(new Set(rolesScopedTo(roles, candForm.segment).map((r) => r.department))).sort();
  const rolesInScope = rolesScopedTo(roles, candForm.segment, candForm.department);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (addType === "Reliever" && onCreateReliever) {
        await onCreateReliever({
          id: `rel-${Date.now()}`,
          name: relieverForm.name,
          role: relieverForm.role,
          phone: relieverForm.phone,
          branchesCovered: relieverForm.selectedBranches,
          availabilityDates: relieverForm.availabilityDates,
          status: "Active",
        });
        setRelieverForm({ name: "", phone: "", role: RELIEVER_CADRES[0], availabilityDates: "", selectedBranches: [] });
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
          roleId: candForm.roleId,
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
        <Button className="bg-penda-teal hover:bg-penda-teal-dark">Add Candidate</Button>
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
                    addType === t ? "bg-penda-teal text-white" : "text-muted-foreground hover:text-foreground"
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

              <Field label="Role">
                <Select value={candForm.roleId} onValueChange={(v) => updateCand("roleId", v)}>
                  <SelectTrigger><SelectValue placeholder="Select a role" /></SelectTrigger>
                  <SelectContent>
                    {rolesInScope.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.title} · {r.location}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

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
                <Input value={relieverForm.name} onChange={(e) => updateReliever("name", e.target.value)} required />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Role Function">
                  <Select value={relieverForm.role} onValueChange={(v) => updateReliever("role", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {RELIEVER_CADRES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Phone">
                  <Input value={relieverForm.phone} onChange={(e) => updateReliever("phone", e.target.value)} required />
                </Field>
              </div>

              <Field label="Availability">
                <Input
                  value={relieverForm.availabilityDates}
                  onChange={(e) => updateReliever("availabilityDates", e.target.value)}
                  placeholder="Jun 22 – Jul 5, 2026"
                  required
                />
              </Field>

              <Field label={`Branches Covered${relieverForm.selectedBranches.length > 0 ? ` (${relieverForm.selectedBranches.length} selected)` : ""}`}>
                <BranchPicker
                  branches={branches}
                  selected={relieverForm.selectedBranches}
                  onToggleBranch={toggleRelieverBranch}
                  onToggleRegion={toggleRelieverRegion}
                />
              </Field>
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

          <DialogFooter>
            <Button type="submit" disabled={submitting} className="bg-penda-teal hover:bg-penda-teal-dark">
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
