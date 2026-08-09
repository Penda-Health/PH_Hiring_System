"use client";

import * as React from "react";
import { WorkTrial, Candidate, Branch } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";

interface Props {
  candidates: Candidate[];
  branches: Branch[];
  onCreate: (trial: WorkTrial) => Promise<void>;
}

const EMPTY_WORK_TRIAL: WorkTrial = {
  id: "",
  wtId: "",
  candidateId: "",
  branchId: "",
  date: "",
  supervisor: "",
  arrivalMarked: null,
  scoreTechnical: null,
  scorePatient: null,
  scoreSafety: null,
  scoreCulture: null,
  total: null,
  passFail: "Pending",
  formSubmittedAt: null,
  submittedByRole: null,
  bmApprovedAt: null,
  reminder12hSent: false,
  escalation24hSent: false,
  submissionMethod: null,
};

export function NewWorkTrialDialog({ candidates, branches, onCreate }: Props) {
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({ candidateId: "", branchId: "", date: "", supervisor: "" });

  function reset() {
    setForm({ candidateId: "", branchId: "", date: "", supervisor: "" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.candidateId || !form.branchId || !form.date || !form.supervisor.trim()) return;
    setSaving(true);
    try {
      await onCreate({ ...EMPTY_WORK_TRIAL, ...form });
      setOpen(false);
      reset();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-penda-blue hover:bg-penda-blue-dark text-white">
          <Plus className="h-4 w-4 mr-1.5" />
          New Work Trial
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Work Trial</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Candidate</Label>
            <Select value={form.candidateId} onValueChange={(v) => setForm((f) => ({ ...f, candidateId: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select candidate…" />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name || "(no name)"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Branch</Label>
            <Select
              value={form.branchId}
              onValueChange={(v) => {
                const branch = branches.find((b) => b.id === v);
                setForm((f) => ({ ...f, branchId: v, supervisor: branch?.branchManager ?? f.supervisor }));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select branch…" />
              </SelectTrigger>
              <SelectContent>
                {branches.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Date</Label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Supervisor</Label>
            <Input
              value={form.supervisor}
              onChange={(e) => setForm((f) => ({ ...f, supervisor: e.target.value }))}
              placeholder="Supervisor name"
              required
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              type="submit"
              disabled={saving || !form.candidateId || !form.branchId || !form.date || !form.supervisor.trim()}
              className="bg-penda-blue hover:bg-penda-blue-dark text-white"
            >
              {saving ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
