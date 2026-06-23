"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { FormShell, FormMessage } from "@/components/forms/form-shell";

type FormData = {
  candidateName: string;
  roleTitle: string;
  branchName: string;
  trialDate: string;
  arrivalMarked: boolean | null;
  alreadyScored: boolean;
};

const CRITERIA = [
  { key: "technical", label: "Technical Skills", weight: 0.4, tooltip: "Clinical competency, procedure accuracy, equipment handling" },
  { key: "patient", label: "Patient Interaction", weight: 0.3, tooltip: "Communication, empathy, bedside manner" },
  { key: "safety", label: "Safety & Compliance", weight: 0.2, tooltip: "Protocol adherence, hygiene, safety awareness" },
  { key: "culture", label: "Culture Fit", weight: 0.1, tooltip: "Team behaviour, Penda values, attitude" },
] as const;

type ScoreKey = (typeof CRITERIA)[number]["key"];

function BmFeedbackForm() {
  const token = useSearchParams().get("token");
  const [data, setData] = React.useState<FormData | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [arrivalSubmitting, setArrivalSubmitting] = React.useState(false);
  const [arrivalResult, setArrivalResult] = React.useState<boolean | null>(null);

  const [scores, setScores] = React.useState<Record<ScoreKey, number>>({
    technical: 50,
    patient: 50,
    safety: 50,
    culture: 50,
  });
  const [notes, setNotes] = React.useState("");
  const [scoreSubmitting, setScoreSubmitting] = React.useState(false);
  const [scoreResult, setScoreResult] = React.useState<{ total: number; passFail: "Pass" | "Fail" } | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!token) {
      setLoadError("missing_token");
      return;
    }
    fetch(`/api/public/bm-feedback?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "error");
        }
        return res.json();
      })
      .then((d: FormData) => {
        setData(d);
        setArrivalResult(d.arrivalMarked);
      })
      .catch((err) => setLoadError(err.message));
  }, [token]);

  if (loadError === "missing_token" || loadError === "expired") {
    return (
      <FormShell title="Link expired" subtitle="This feedback link is no longer valid.">
        <FormMessage>
          <p>This link has expired or is invalid. Please contact the recruitment team for a new one.</p>
          <p>Email: <a className="text-penda-teal underline" href="mailto:ta@penda.co.ke">ta@penda.co.ke</a></p>
        </FormMessage>
      </FormShell>
    );
  }

  if (loadError) {
    return (
      <FormShell title="Something went wrong">
        <FormMessage>
          <p>Please try again later, or contact <a className="text-penda-teal underline" href="mailto:ta@penda.co.ke">ta@penda.co.ke</a>.</p>
        </FormMessage>
      </FormShell>
    );
  }

  if (!data) {
    return (
      <FormShell title="Loading…">
        <p className="text-sm text-muted-foreground">Loading work trial details…</p>
      </FormShell>
    );
  }

  const total = CRITERIA.reduce((sum, c) => sum + scores[c.key] * c.weight, 0);
  const pass = total >= 70;

  async function handleArrival(arrived: boolean) {
    setSubmitError(null);
    setArrivalSubmitting(true);
    try {
      const res = await fetch("/api/public/bm-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, step: "arrival", arrived }),
      });
      if (!res.ok) throw new Error("Something went wrong. Please try again.");
      setArrivalResult(arrived);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setArrivalSubmitting(false);
    }
  }

  async function handleScoreSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setScoreSubmitting(true);
    try {
      const res = await fetch("/api/public/bm-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, step: "scoring", scores, notes: notes || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body.error === "already_submitted"
            ? "This assessment has already been submitted."
            : "Something went wrong. Please try again."
        );
      }
      const body = await res.json();
      setScoreResult({ total: body.total, passFail: body.passFail });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setScoreSubmitting(false);
    }
  }

  const header = `${data.candidateName} · ${data.roleTitle} · ${data.branchName} · ${data.trialDate}`;

  if (scoreResult) {
    return (
      <FormShell title="Assessment submitted" subtitle={header}>
        <FormMessage>
          <p>
            Score: <strong>{scoreResult.total}/100</strong> —{" "}
            <Badge variant={scoreResult.passFail === "Pass" ? "ips" : "so"}>{scoreResult.passFail}</Badge>
          </p>
          <p>The recruitment team has been notified. Thank you.</p>
        </FormMessage>
      </FormShell>
    );
  }

  if (data.alreadyScored) {
    return (
      <FormShell title="Already submitted" subtitle={header}>
        <FormMessage>
          <p>This assessment has already been submitted. Contact ta@penda.co.ke if you need to make a correction.</p>
        </FormMessage>
      </FormShell>
    );
  }

  if (arrivalResult === null) {
    return (
      <FormShell title="Did the candidate arrive?" subtitle={header}>
        <div className="space-y-4">
          <p className="text-sm text-foreground/80">
            Please confirm whether {data.candidateName} arrived for their work trial today.
          </p>
          {submitError && <p className="text-sm text-destructive">{submitError}</p>}
          <div className="flex gap-3">
            <Button className="flex-1 bg-penda-teal hover:bg-penda-teal-dark" onClick={() => handleArrival(true)} disabled={arrivalSubmitting}>
              Yes, they arrived
            </Button>
            <Button className="flex-1" variant="outline" onClick={() => handleArrival(false)} disabled={arrivalSubmitting}>
              No, they didn&apos;t
            </Button>
          </div>
        </div>
      </FormShell>
    );
  }

  if (arrivalResult === false) {
    return (
      <FormShell title="Recorded" subtitle={header}>
        <FormMessage>
          <p>Thanks — we&apos;ve recorded that {data.candidateName} did not arrive. The recruitment team has been notified.</p>
        </FormMessage>
      </FormShell>
    );
  }

  return (
    <FormShell title="Work trial scoring" subtitle={header}>
      <form onSubmit={handleScoreSubmit} className="space-y-6">
        {CRITERIA.map((c) => (
          <div key={c.key} className="space-y-2">
            <div className="flex items-center justify-between">
              <Label title={c.tooltip}>
                {c.label} <span className="text-muted-foreground">({Math.round(c.weight * 100)}%)</span>
              </Label>
              <span className="text-sm font-medium">{scores[c.key]}</span>
            </div>
            <Slider
              value={[scores[c.key]]}
              onValueChange={([v]) => setScores((s) => ({ ...s, [c.key]: v }))}
              min={0}
              max={100}
              step={1}
            />
            <p className="text-xs text-muted-foreground">{c.tooltip}</p>
          </div>
        ))}

        <div className="rounded-lg border border-border p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">
              (Tech × 0.4) + (Patient × 0.3) + (Safety × 0.2) + (Culture × 0.1)
            </p>
            <p className="text-2xl font-semibold">{total.toFixed(1)} / 100</p>
          </div>
          <Badge variant={pass ? "ips" : "so"}>{pass ? "PASS" : "FAIL"}</Badge>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Supervisor observations</Label>
          <Textarea id="notes" required value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
        </div>

        {submitError && <p className="text-sm text-destructive">{submitError}</p>}

        <Button type="submit" className="w-full bg-penda-teal hover:bg-penda-teal-dark" disabled={!notes || scoreSubmitting}>
          {scoreSubmitting ? "Submitting…" : "Submit assessment"}
        </Button>
      </form>
    </FormShell>
  );
}

export default function BmFeedbackPage() {
  return (
    <React.Suspense fallback={null}>
      <BmFeedbackForm />
    </React.Suspense>
  );
}
