"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
import { ArrowLeftRight, Building2, Plus, User, UserPlus } from "lucide-react";

interface Props {
  branches: Branch[];
  openRoles: OpenRole[];
  onCreate: (role: OpenRole) => Promise<OpenRole | undefined>;
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
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [segment, setSegment] = React.useState<Segment>("IPS");
  const [form, setForm] = React.useState(makeEmptyForm("IPS"));
  const [notes, setNotes] = React.useState("");
  const [employmentType, setEmploymentType] = React.useState("");
  const [hiringManagerEmail, setHiringManagerEmail] = React.useState("");
  const [selectedBranch, setSelectedBranch] = React.useState<Branch | null>(null);
  // "Group role" mode — one role's headcount split across several branches
  // at once (location reads "Multiple Locations"), e.g. a Nurse In-Charge
  // opening posted across a cluster of branches simultaneously. IPS only —
  // SO roles use free-text location, there's no branch list to pick from.
  const [multiBranch, setMultiBranch] = React.useState(false);
  const [selectedBranchIds, setSelectedBranchIds] = React.useState<string[]>([]);
  // How this seat will be filled — "internal" means someone's being pulled
  // off an existing role/branch to take it, which opens a gap elsewhere
  // that needs its own backfill (e.g. adding a Pharmtech Incharge by
  // promoting an existing branch's Pharmtech leaves a Pharmtech vacancy
  // there, not an Incharge one — the backfill's title can differ from this
  // role's, which is exactly what the linked Requisition captures
  // separately below rather than assuming it matches).
  const [fillPlan, setFillPlan] = React.useState<"external" | "internal">("external");

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
    setMultiBranch(false);
    setSelectedBranchIds([]);
    setFillPlan("external");
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
    setMultiBranch(false);
    setSelectedBranchIds([]);
    setFillPlan("external");
  }

  // Toggling group-role mode on/off swaps which branch field(s) actually
  // drive location — clear whichever isn't in use so a stale single/multi
  // selection can't leak into the submitted role.
  function handleMultiBranchToggle(on: boolean) {
    setMultiBranch(on);
    setSelectedBranch(null);
    setSelectedBranchIds([]);
    setForm((f) => ({ ...f, branchId: undefined, location: "" }));
  }

  function toggleGroupBranch(branchId: string) {
    setSelectedBranchIds((prev) => {
      const next = prev.includes(branchId) ? prev.filter((id) => id !== branchId) : [...prev, branchId];
      const names = branches.filter((b) => next.includes(b.id)).map((b) => b.name);
      setForm((f) => ({
        ...f,
        branchId: next[0],
        location: next.length > 1 ? "Multiple Locations" : names[0] || "",
        // Default HC Approved to "one opening per branch" — the common
        // case — but only while the user hasn't already typed a different
        // number in, so their edit isn't silently clobbered by a later
        // checkbox click.
        hcApproved: f.hcApproved === prev.length || f.hcApproved === 1 ? Math.max(1, next.length) : f.hcApproved,
      }));
      return next;
    });
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

  // Relievers and locums cover whichever branch needs them that day rather
  // than sitting at one fixed location, so don't force a Branch/Location
  // pick for those two employment types the way every other role needs one.
  const locationOptional = employmentType === "Reliever" || employmentType === "Locum";

  const valid =
    form.title.trim() &&
    form.department.trim() &&
    (form.location.trim() || locationOptional) &&
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
        // openRoleSchema requires a non-empty location server-side (POST
        // doesn't strip blanks the way PATCH does) — fall back to a
        // placeholder rather than leave it blank when the picker was
        // skipped for a Reliever/Locum role.
        location: form.location.trim() || (locationOptional ? `${employmentType} Pool` : form.location),
        segment,
        notes: notes.trim() || undefined,
        employmentType: (employmentType as OpenRole["employmentType"]) || undefined,
        internalFill: fillPlan === "internal",
        ...(multiBranch ? { branchIds: selectedBranchIds } : {}),
      };
      const created = await onCreate(role);
      setOpen(false);
      // Internal move → this role's headcount doesn't create net-new
      // headcount, it just relocates it, so go straight into raising the
      // requisition for the seat it vacates (same guided form + linkRoleId
      // wiring "+ Raise the replacement requisition" already uses — see
      // ReplacementRequisitionPicker). Skipped if creation somehow didn't
      // return the new role's id; the "Internal Fill" flag is still set,
      // so the role will still show "Needs Replacement" and the link can
      // be raised later from the role itself.
      if (fillPlan === "internal" && created?.id) {
        const href =
          segment === "IPS"
            ? `/requisitions/new/ips?linkRoleId=${created.id}&gapReason=Transfer`
            : `/requisitions/new/so?linkRoleId=${created.id}`;
        router.push(href);
      }
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
                      ? "border-penda-blue bg-penda-blue/10 text-penda-blue"
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

          {/* ── Fill plan ────────────────────────────────── */}
          <div className="space-y-1.5">
            <Label>How will this role be filled?</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFillPlan("external")}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                  fillPlan === "external"
                    ? "border-penda-blue bg-penda-blue/10 text-penda-blue"
                    : "border-border text-muted-foreground hover:bg-muted"
                )}
              >
                <UserPlus className="h-4 w-4" />
                <span>Fresh / external hire</span>
                <span className="text-xs font-normal text-center">No backfill needed</span>
              </button>
              <button
                type="button"
                onClick={() => setFillPlan("internal")}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                  fillPlan === "internal"
                    ? "border-penda-blue bg-penda-blue/10 text-penda-blue"
                    : "border-border text-muted-foreground hover:bg-muted"
                )}
              >
                <ArrowLeftRight className="h-4 w-4" />
                <span>Internal move</span>
                <span className="text-xs font-normal text-center">Pulls someone off another role — needs a backfill</span>
              </button>
            </div>
            {fillPlan === "internal" && (
              <p className="text-xs text-muted-foreground">
                After you create this role, you&apos;ll go straight to raising the requisition for the seat it
                vacates — that backfill can be a different title/branch than this one (e.g. adding a Pharmtech
                Incharge by promoting an existing Pharmtech backfills a Pharmtech, not another Incharge).
              </p>
            )}
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
            <div className="flex items-center justify-between">
              <Label>
                {segment === "IPS" ? "Branch" : "Location"}
                {locationOptional && (
                  <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                    (optional for {employmentType})
                  </span>
                )}
              </Label>
              {segment === "IPS" && (
                <button
                  type="button"
                  onClick={() => handleMultiBranchToggle(!multiBranch)}
                  className="text-xs font-medium text-penda-blue hover:underline"
                >
                  {multiBranch ? "Switch to single branch" : "This is a group role (multiple branches)"}
                </button>
              )}
            </div>
            {segment === "IPS" ? (
              multiBranch ? (
                <>
                  <div className="max-h-48 overflow-y-auto rounded-md border border-border divide-y">
                    {branches
                      .filter((b) => b.active && b.segment === "IPS")
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((b) => (
                        <label
                          key={b.id}
                          className="flex items-center gap-2 px-3 py-1.5 text-sm cursor-pointer hover:bg-muted"
                        >
                          <input
                            type="checkbox"
                            checked={selectedBranchIds.includes(b.id)}
                            onChange={() => toggleGroupBranch(b.id)}
                            className="h-3.5 w-3.5 cursor-pointer accent-penda-blue"
                          />
                          <span>{b.name}</span>
                          {b.city && b.city !== b.name && (
                            <span className="text-muted-foreground">· {b.city}</span>
                          )}
                        </label>
                      ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {selectedBranchIds.length > 0
                      ? `${selectedBranchIds.length} branch${selectedBranchIds.length === 1 ? "" : "es"} selected · Location will read "${form.location}"`
                      : "Select every branch this posting is open at."}{" "}
                    Closing a gap later will ask which one of these it was for, and split that branch out into its
                    own closed role.
                  </p>
                </>
              ) : (
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
                        .filter((b) => b.active && b.segment === "IPS")
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
                  {locationOptional && !selectedBranch && (
                    <p className="text-xs text-muted-foreground">
                      {employmentType}s cover wherever they&apos;re needed — leave this blank if the role isn&apos;t
                      tied to one branch.
                    </p>
                  )}
                </>
              )
            ) : (
              <Input
                value={form.location}
                onChange={(e) => set("location", e.target.value)}
                placeholder={locationOptional ? `Leave blank to cover any location` : "e.g. Karen, Nairobi"}
                required={!locationOptional}
              />
            )}
          </div>

          {/* ── HC Approved ──────────────────────────────── */}
          <div className="space-y-1.5">
            <Label>HC Approved</Label>
            <Input
              type="number"
              min={0.5}
              step={0.5}
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
              className="bg-penda-blue hover:bg-penda-blue-dark text-white"
            >
              {saving ? "Creating…" : fillPlan === "internal" ? "Create Role & Raise Backfill" : "Create Role"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
