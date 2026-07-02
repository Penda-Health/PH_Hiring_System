"use client";

import * as React from "react";
import { OpenRole, Segment, Priority } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";

interface Props {
  onCreate: (role: OpenRole) => Promise<void>;
}

const SEGMENTS: Segment[] = ["IPS", "SO"];
const PRIORITIES: Priority[] = ["Critical", "High", "Medium", "Low"];
const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Reliever", "Locum"] as const;

const today = () => new Date().toISOString().slice(0, 10);

const EMPTY: OpenRole = {
  id: "", roleId: "", title: "", segment: "IPS", department: "", location: "",
  priority: "High", status: "Open", hcApproved: 1, hcFilled: 0,
  recruiter: "", hiringManager: "", datePosted: today(),
};

export function NewOpenRoleDialog({ onCreate }: Props) {
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({ ...EMPTY });
  const [notes, setNotes] = React.useState("");
  const [employmentType, setEmploymentType] = React.useState<string>("");

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function reset() {
    setForm({ ...EMPTY, datePosted: today() });
    setNotes("");
    setEmploymentType("");
  }

  const valid =
    form.title.trim() &&
    form.segment &&
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
          <div className="space-y-1.5">
            <Label>Job Title</Label>
            <Input value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Clinical Officer" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Segment</Label>
              <Select value={form.segment} onValueChange={(v) => set("segment", v as Segment)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SEGMENTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v) => set("priority", v as Priority)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Input value={form.department} onChange={(e) => set("department", e.target.value)} placeholder="e.g. Clinical Services" required />
            </div>
            <div className="space-y-1.5">
              <Label>Location / Branch</Label>
              <Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Mathare North" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>HC Approved</Label>
              <Input
                type="number" min={1}
                value={form.hcApproved}
                onChange={(e) => set("hcApproved", Number(e.target.value))}
                required
              />
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Recruiter</Label>
              <Input value={form.recruiter} onChange={(e) => set("recruiter", e.target.value)} placeholder="Name" required />
            </div>
            <div className="space-y-1.5">
              <Label>Hiring Manager</Label>
              <Input value={form.hiringManager} onChange={(e) => set("hiringManager", e.target.value)} placeholder="Name" required />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Date Posted</Label>
            <Input type="date" value={form.datePosted} onChange={(e) => set("datePosted", e.target.value)} required />
          </div>

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
