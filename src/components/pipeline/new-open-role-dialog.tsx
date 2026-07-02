"use client";

import * as React from "react";
import { Branch, OpenRole, Priority, Segment } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RoleTitleInput } from "@/components/requisitions/role-title-input";
import { departmentOptionsFor } from "@/lib/department-options";
import { cn } from "@/lib/utils";
import { Building2, Plus, User } from "lucide-react";

interface Props {
  branches: Branch[];
  openRoles: OpenRole[];
  onCreate: (role: OpenRole) => Promise<void>;
}

const IPS_STANDARD_TITLES = [
  "Nurse",
  "Clinical Officer",
  "Pharmacist",
  "Lab Technician",
  "Pharmacy Technician",
  "Sonographer",
  "Dental Officer",
  "Dental Technician",
  "Front Office Officer",
  "Clinic Incharge",
  "Branch Manager",
  "Labtechnician Incharge",
  "Pharmacy Incharge",
];

const PRIORITIES: Priority[] = ["Critical", "High", "Medium", "Low"];
const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Reliever", "Locum"] as const;

const today = () => new Date().toISOString().slice(0, 10);

function makeEmptyForm(segment: Segment): OpenRole & { hiringManagerEmail?: string } {
  return {
    id: "", roleId: "", title: "", segment, department: "", location: "",
    priority: "High", status: "Open", hcApproved: 1, hcFilled: 0,
    recruiter: "", hiringManager: "", datePosted: today(),
    branchId: undefined,
  };
}

export function NewOpenRoleDialog({ branches, openRoles, onCreate }: Props) {
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [segment, setSegment] = React.useState<Segment>("IPS");
  const [form, setForm] = React.useState(makeEmptyForm("IPS"));
  const [notes, setNotes] = React.useState("");
  const [employmentType, setEmploymentType] = React.useState("");
  const [hiringManagerEmail, setHiringManagerEmail] = React.useState("");
  const [selectedBranch, setSelectedBranch] = React.useState<Branch | null>(null);

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function handleSegmentChange(seg: Segment) {
    setSegment(seg);
    setForm(makeEmptyForm(seg));
    setNotes("");
    setEmploymentType("");
    setHiringManagerEmail("");
    setSelectedBranch(null);
  }

  function handleBranchSelect(branchId: string) {
    const branch = branches.find((b) => b.id === branchId) ?? null;
    setSelectedBranch(branch);
    if (branch) {
      setForm((f) => ({
        ...f,
        branchId: branch.id,
        location: branch.name,
        hiringManager: branch.branchManager,
      }));
    } else {
      setForm((f) => ({ ...f, branchId: undefined, location: "", hiringManager: "" }));
    }
  }

  function reset() {
    setSegment("IPS");
    setForm(makeEmptyForm("IPS"));
    setNotes("");
    setEmploymentType("");
    setHiringManagerEmail("");
    setSelectedBranch(null);
  }

  // Autocomplete suggestions — segment-scoped
  const titleSuggestions = React.useMemo(() => {
    const existing = openRoles.filter((r) => r.segment === segment).map((r) => r.title);
    const base = segment === "IPS" ? IPS_STANDARD_TITLES : [];
    return Array.from(new Set([...base, ...existing])).sort((a, b) => a.localeCompare(b));
  }, [openRoles, segment]);

  const recruiterSuggestions = React.useMemo(() => {
    return Array.from(new Set(openRoles.map((r) => r.recruiter).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b)
    );
  }, [openRoles]);

  const departmentOptions = departmentOptionsFor(segment);

  const valid =
    form.title.trim() &&
    form.department.trim() &&
    form.location.trim() &&
    form.priority &&
    form.hcApproved > 0 &&
    form.recruiter.trim() &&
    form.hiringManager.trim() &&
    form.datePosted;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    try {
      const role: OpenRole = {
        ...form,
        segment,
        notes: notes.trim() || undefined,
        employmentType: (employmentType as OpenRole["employmentType"]) || undefined,
      };
      await onCreate(role);
      setOpen(false);
      reset();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-1.5" />
          Add Role
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Open Role</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* ── Segment toggle ───────────────────────────── */}
          <div className="space-y-1.5">
            <Label>Segment</Label>
            <div className="grid grid-cols-2 gap-2">
              {(["IPS", "SO"] as Segment[]).map((seg) => (
                <button
                  key={seg}
                  type="button"
                  onClick={() => handleSegmentChange(seg)}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-lg border px-4 py-3 text-sm font-medium transition-colors",
                    segment === seg
                      ? "border-penda-teal bg-penda-teal/10 text-penda-teal"
                      : "border-border text-muted-foreground hover:bg-muted"
                  )}
                >
                  <span className="text-base font-semibold">{seg}</span>
                  <span className="text-xs font-normal">
                    {seg === "IPS" ? "In-Patient Services" : "Support Office"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Job title ────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label>Job Title</Label>
            <RoleTitleInput
              value={form.title}
              onChange={(v) => set("title", v)}
              suggestions={titleSuggestions}
              placeholder={segment === "IPS" ? "e.g. Clinical Officer" : "e.g. Finance Manager"}
              required
            />
          </div>

          {/* ── Priority + Employment Type ────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => set("priority", v as Priority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Employment Type</Label>
              <Select value={employmentType} onValueChange={setEmploymentType}>
                <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— none —</SelectItem>
                  {EMPLOYMENT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── Department ───────────────────────────────── */}
          <div className="space-y-1.5">
            <Label>Department / Function</Label>
            <Select value={form.department} onValueChange={(v) => set("department", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select department…" />
              </SelectTrigger>
              <SelectContent>
                {departmentOptions.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* ── Branch / Location ─────────────────────────── */}
          <div className="space-y-1.5">
            <Label>{segment === "IPS" ? "Branch" : "Location"}</Label>
            {segment === "IPS" ? (
              <>
                <Select
                  value={selectedBranch?.id ?? ""}
                  onValueChange={handleBranchSelect}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select branch…" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches
                      .filter((b) => b.active)
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          <span className="font-medium">{b.name}</span>
                          {b.city && b.city !== b.name && (
                            <span className="ml-1.5 text-muted-foreground">· {b.city}</span>
                          )}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {selectedBranch && (
                  <div className="flex items-center gap-4 rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <User className="h-3 w-3" />
                      <span>BM: <span className="font-medium text-foreground">{selectedBranch.branchManager || "—"}</span></span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Building2 className="h-3 w-3" />
                      <span>RM: <span className="font-medium text-foreground">{selectedBranch.regionalManager || "—"}</span></span>
                    </span>
                  </div>
                )}
              </>
            ) : (
              <Input
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder="e.g. Karen, Nairobi"
                required
              />
            )}
          </div>

          {/* ── HC Approved ──────────────────────────────── */}
          <div className="space-y-1.5">
            <Label>HC Approved</Label>
            <Input
              type="number"
              min={1}
              value={form.hcApproved}
              onChange={(e) => set("hcApproved", Number(e.target.value))}
              required
            />
          </div>

          {/* ── Recruiter ────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label>Recruiter</Label>
            <RoleTitleInput
              value={form.recruiter}
              onChange={(v) => set("recruiter", v)}
              suggestions={recruiterSuggestions}
              placeholder="Recruiter name"
              required
            />
          </div>

          {/* ── Hiring Manager ───────────────────────────── */}
          <div className="space-y-1.5">
            <Label>
              Hiring Manager
              {segment === "IPS" && selectedBranch && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">(auto-filled from branch manager)</span>
              )}
            </Label>
            <Input
              value={form.hiringManager}
              onChange={(e) => set("hiringManager", e.target.value)}
              placeholder="Name"
              required
            />
            {segment === "SO" && (
              <Input
                type="email"
                value={hiringManagerEmail}
                onChange={(e) => setHiringManagerEmail(e.target.value)}
                placeholder="Hiring manager email (for notifications)"
                className="mt-2"
              />
            )}
          </div>

          {/* ── Date Posted ──────────────────────────────── */}
          <div className="space-y-1.5">
            <Label>Date Posted</Label>
            <Input
              type="date"
              value={form.datePosted}
              onChange={(e) => set("datePosted", e.target.value)}
              required
            />
          </div>

          {/* ── Notes ────────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label>Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any relevant context…" rows={3} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              type="submit"
              disabled={saving || !valid}
              className="bg-penda-teal hover:bg-penda-teal-dark text-white"
            >
              {saving ? "Creating…" : "Create Role"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
