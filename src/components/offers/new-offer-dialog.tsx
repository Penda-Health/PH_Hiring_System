"use client";

import * as React from "react";
import { Offer, Candidate } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";

interface Props {
  candidates: Candidate[];
  onCreate: (offer: Offer) => Promise<void>;
}

const today = () => new Date().toISOString().slice(0, 10);

export function NewOfferDialog({ candidates, onCreate }: Props) {
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState({
    candidateId: "",
    offeredSalary: "",
    budgetedSalary: "",
    dateSent: today(),
    deadline: "",
  });

  function reset() {
    setForm({ candidateId: "", offeredSalary: "", budgetedSalary: "", dateSent: today(), deadline: "" });
  }

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const valid =
    form.candidateId &&
    form.offeredSalary &&
    !isNaN(Number(form.offeredSalary)) &&
    form.budgetedSalary &&
    !isNaN(Number(form.budgetedSalary)) &&
    form.dateSent &&
    form.deadline;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    try {
      const offer: Offer = {
        id: "",
        offerId: "",
        candidateId: form.candidateId,
        offeredSalary: Number(form.offeredSalary),
        budgetedSalary: Number(form.budgetedSalary),
        dateSent: form.dateSent,
        deadline: form.deadline,
        outcome: "Pending",
        joined: "Pending",
      };
      await onCreate(offer);
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
          New Offer
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Offer</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Candidate</Label>
            <Select value={form.candidateId} onValueChange={(v) => set("candidateId", v)}>
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Offered salary (KES)</Label>
              <Input
                type="number"
                min={0}
                value={form.offeredSalary}
                onChange={(e) => set("offeredSalary", e.target.value)}
                placeholder="0"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Budgeted salary (KES)</Label>
              <Input
                type="number"
                min={0}
                value={form.budgetedSalary}
                onChange={(e) => set("budgetedSalary", e.target.value)}
                placeholder="0"
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Date sent</Label>
              <Input
                type="date"
                value={form.dateSent}
                onChange={(e) => set("dateSent", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Deadline</Label>
              <Input
                type="date"
                value={form.deadline}
                onChange={(e) => set("deadline", e.target.value)}
                required
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              type="submit"
              disabled={saving || !valid}
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
