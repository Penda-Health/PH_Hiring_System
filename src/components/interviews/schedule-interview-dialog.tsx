"use client";

import * as React from "react";
import { Candidate, Interview, InterviewStage, InterviewType } from "@/types";
import { computeWeekLabel, interviewStages } from "@/lib/interview-helpers";
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

const INTERVIEW_TYPES: InterviewType[] = ["In-person", "Google Meet", "Phone", "WhatsApp"];

export function ScheduleInterviewDialog({
  candidates,
  onCreate,
  defaultCandidateId,
  open: controlledOpen,
  onOpenChange: setControlledOpen,
}: {
  candidates: Candidate[];
  onCreate: (interview: Interview) => Promise<void>;
  defaultCandidateId?: string;
  /** Omit both to get the default self-contained trigger button (used on /interviews). Pass both to drive the dialog from elsewhere, e.g. a row action menu, with no visible trigger rendered. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isControlled = controlledOpen !== undefined && setControlledOpen !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = isControlled ? setControlledOpen : setUncontrolledOpen;
  const [submitting, setSubmitting] = React.useState(false);
  const [form, setForm] = React.useState({
    candidateId: defaultCandidateId ?? candidates[0]?.id ?? "",
    stage: "First Interview" as InterviewStage,
    type: "In-person" as InterviewType,
    date: "",
    time: "",
    location: "",
    interviewers: "",
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // Re-syncs the preselected candidate each time this dialog is reopened for a
  // different one (controlled usage reuses a single dialog instance, so a plain
  // useState initializer alone wouldn't pick up the new defaultCandidateId).
  React.useEffect(() => {
    if (open && defaultCandidateId) {
      setForm((prev) => ({ ...prev, candidateId: defaultCandidateId }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultCandidateId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const candidate = candidates.find((c) => c.id === form.candidateId);
    if (!candidate) return;
    const { weekLabel, month } = computeWeekLabel(form.date);
    const interview: Interview = {
      id: `int-${Date.now()}`,
      schedId: "", // assigned by the server on create
      candidateId: candidate.id,
      roleId: candidate.roleId,
      date: form.date,
      time: form.time,
      weekLabel,
      month,
      stage: form.stage,
      type: form.type,
      location: form.location,
      interviewers: form.interviewers.split(",").map((s) => s.trim()).filter(Boolean),
      confirmed: false,
      reminderSent: false,
      attendance: "Pending",
      outcome: "Pending",
    };
    setSubmitting(true);
    try {
      await onCreate(interview);
      setOpen(false);
      setForm((prev) => ({ ...prev, date: "", time: "", location: "", interviewers: "" }));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          <Button className="bg-penda-teal hover:bg-penda-teal-dark">Schedule Interview</Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Schedule Interview</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Candidate">
            <Select value={form.candidateId} onValueChange={(v) => update("candidateId", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {candidates.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Stage">
              <Select value={form.stage} onValueChange={(v) => update("stage", v as InterviewStage)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {interviewStages.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Type">
              <Select value={form.type} onValueChange={(v) => update("type", v as InterviewType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERVIEW_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Date">
              <Input type="date" value={form.date} onChange={(e) => update("date", e.target.value)} required />
            </Field>
            <Field label="Time">
              <Input type="time" value={form.time} onChange={(e) => update("time", e.target.value)} required />
            </Field>
          </div>

          <Field label="Location / Link">
            <Input value={form.location} onChange={(e) => update("location", e.target.value)} required />
          </Field>

          <Field label="Interviewer(s)">
            <Input
              value={form.interviewers}
              onChange={(e) => update("interviewers", e.target.value)}
              placeholder="Dr. Wanjiru, Mash"
              required
            />
          </Field>

          <DialogFooter>
            <Button type="submit" disabled={submitting} className="bg-penda-teal hover:bg-penda-teal-dark">
              {submitting ? "Scheduling…" : "Schedule"}
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
