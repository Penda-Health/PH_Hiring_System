"use client";

import * as React from "react";
import { ReferenceCheck, Candidate, RefereeStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";

interface Props {
  candidates: Candidate[];
  onCreate: (refCheck: ReferenceCheck) => Promise<void>;
}

const EMPTY_REFEREE: RefereeStatus = {
  name: "", email: "", phone: "",
  emailSent: false, smsSent: false, responded: false,
};

function RefereeFields({
  label,
  value,
  onChange,
}: {
  label: string;
  value: { name: string; email: string; phone: string };
  onChange: (v: { name: string; email: string; phone: string }) => void;
}) {
  return (
    <fieldset className="space-y-2 rounded-md border border-border p-3">
      <legend className="px-1 text-sm font-medium">{label}</legend>
      <div className="space-y-1.5">
        <Label className="text-xs">Name</Label>
        <Input
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder="Full name"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Email</Label>
        <Input
          type="email"
          value={value.email}
          onChange={(e) => onChange({ ...value, email: e.target.value })}
          placeholder="referee@example.com"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-xs">Phone</Label>
        <Input
          value={value.phone}
          onChange={(e) => onChange({ ...value, phone: e.target.value })}
          placeholder="+254…"
        />
      </div>
    </fieldset>
  );
}

export function NewReferenceCheckDialog({ candidates, onCreate }: Props) {
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [candidateId, setCandidateId] = React.useState("");
  const [ref1, setRef1] = React.useState({ name: "", email: "", phone: "" });
  const [ref2, setRef2] = React.useState({ name: "", email: "", phone: "" });

  function reset() {
    setCandidateId("");
    setRef1({ name: "", email: "", phone: "" });
    setRef2({ name: "", email: "", phone: "" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!candidateId || !ref1.name || !ref2.name) return;
    setSaving(true);
    try {
      const refCheck: ReferenceCheck = {
        id: "",
        refId: "",
        candidateId,
        referee1: { ...EMPTY_REFEREE, ...ref1 },
        referee2: { ...EMPTY_REFEREE, ...ref2 },
        outcome: "Pending",
        driveFolderUrl: null,
        createdAt: new Date().toISOString(),
      };
      await onCreate(refCheck);
      setOpen(false);
      reset();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-penda-teal hover:bg-penda-teal-dark text-white">
          <Plus className="h-4 w-4 mr-1.5" />
          New Reference Check
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Reference Check</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Candidate</Label>
            <Select value={candidateId} onValueChange={setCandidateId}>
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
          <RefereeFields label="Referee 1" value={ref1} onChange={setRef1} />
          <RefereeFields label="Referee 2" value={ref2} onChange={setRef2} />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              type="submit"
              disabled={saving || !candidateId || !ref1.name || !ref2.name}
              className="bg-penda-teal hover:bg-penda-teal-dark text-white"
            >
              {saving ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
