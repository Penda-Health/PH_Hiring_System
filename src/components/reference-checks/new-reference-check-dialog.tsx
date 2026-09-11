"use client";

import * as React from "react";
import { ReferenceCheck, Candidate, RefereeStatus } from "@/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";

interface Props {
  candidates: Candidate[];
  onCreate: (refCheck: ReferenceCheck) => Promise<void>;
}

const EMPTY_REFEREE: RefereeStatus = {
  name: "", email: "", phone: "",
  emailSent: false, smsSent: false, responded: false,
};

export const MIN_REFEREES = 2;
export const MAX_REFEREES = 4;

export function RefereeFields({
  label,
  value,
  onChange,
  onRemove,
}: {
  label: string;
  value: { name: string; email: string; phone: string };
  onChange: (v: { name: string; email: string; phone: string }) => void;
  onRemove?: () => void;
}) {
  return (
    <fieldset className="space-y-2 rounded-md border border-border p-3">
      <div className="flex items-center justify-between px-1">
        <legend className="text-sm font-medium">{label}</legend>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove ${label}`}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
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
  const { user } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [candidateId, setCandidateId] = React.useState("");
  const [referees, setReferees] = React.useState<{ name: string; email: string; phone: string }[]>([
    { name: "", email: "", phone: "" },
    { name: "", email: "", phone: "" },
  ]);

  function reset() {
    setCandidateId("");
    setReferees([
      { name: "", email: "", phone: "" },
      { name: "", email: "", phone: "" },
    ]);
  }

  const allNamed = referees.every((r) => r.name);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!candidateId || !allNamed) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const refCheck: ReferenceCheck = {
        id: "",
        refId: "",
        candidateId,
        referees: referees.map((r) => ({ ...EMPTY_REFEREE, ...r })),
        outcome: "Pending",
        driveFolderUrl: null,
        createdAt: now,
        // TA-entered referees are self-verified by construction (a staff
        // member typed them in directly) — this path initiates immediately,
        // unlike the candidate self-serve path which waits on TA review.
        source: "TA Added",
        status: "Awaiting Responses",
        verifiedAt: now,
        verifiedBy: user?.name || user?.email || "",
        initiatedAt: now,
        aiInsights: null,
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
        <Button size="sm" className="bg-penda-blue hover:bg-penda-blue-dark text-white">
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
          {referees.map((referee, i) => (
            <RefereeFields
              key={i}
              label={`Referee ${i + 1}`}
              value={referee}
              onChange={(v) => setReferees((prev) => prev.map((r, idx) => (idx === i ? v : r)))}
              onRemove={
                referees.length > MIN_REFEREES
                  ? () => setReferees((prev) => prev.filter((_, idx) => idx !== i))
                  : undefined
              }
            />
          ))}
          {referees.length < MAX_REFEREES && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setReferees((prev) => [...prev, { name: "", email: "", phone: "" }])}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add referee
            </Button>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              type="submit"
              disabled={saving || !candidateId || !allNamed}
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
