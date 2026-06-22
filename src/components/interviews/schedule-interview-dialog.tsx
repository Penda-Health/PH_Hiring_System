"use client";

import * as React from "react";
import { Candidate, Interview, InterviewStage, InterviewType } from "@/types";
import { computeWeekLabel, generateSchedId, interviewStages } from "@/lib/interview-helpers";
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
}: {
  candidates: Candidate[];
  onCreate: (interview: Interview) => Promise<void>;
}) {
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [form, setForm] = React.useState({
    candidateId: candidates[0]?.id ?? "",
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const candidate = candidates.find((c) => c.id === form.candidateId);
    if (!candidate) return;
    const { weekLabel, month } = computeWeekLabel(form.date);
    const interview: Interview = {
      id: `int-${Date.now()}`,
      schedId: generateSchedId(),
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
      <DialogTrigger asChild>
        <Button className="bg-penda-teal hover:bg-penda-teal-dark">Schedule Interview</Button>
      </DialogTrigger>
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
