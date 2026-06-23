"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormShell, FormMessage } from "@/components/forms/form-shell";

type FormData = {
  candidateName: string;
  roleTitle: string;
  refereeName: string;
  alreadySubmitted: boolean;
};

const RELATIONSHIPS = ["Direct manager", "Senior colleague", "Peer / colleague", "Client or patient", "Other professional"];
const DURATIONS = ["Less than 1 year", "1-2 years", "2-5 years", "5+ years"];
const REHIRE_OPTIONS = [
  { value: "Yes, without hesitation", label: "Yes, without hesitation" },
  { value: "Yes, with some reservations", label: "Yes, with some reservations" },
  { value: "No, I would not recommend them", label: "No, I would not recommend them" },
] as const;

const SCORE_CRITERIA = [
  { key: "techScore", label: "Technical / professional skills" },
  { key: "reliabilityScore", label: "Reliability & dependability" },
  { key: "teamworkScore", label: "Teamwork & collaboration" },
] as const;
type ScoreKey = (typeof SCORE_CRITERIA)[number]["key"];

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`text-2xl leading-none transition-colors ${n <= value ? "text-penda-teal" : "text-muted-foreground/30"}`}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function RefereeForm() {
  const token = useSearchParams().get("token");
  const [data, setData] = React.useState<FormData | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [relationship, setRelationship] = React.useState("");
  const [durationKnown, setDurationKnown] = React.useState("");
  const [scores, setScores] = React.useState<Record<ScoreKey, number>>({
    techScore: 0,
    reliabilityScore: 0,
    teamworkScore: 0,
  });
  const [wouldRehire, setWouldRehire] = React.useState<string>("");
  const [strengthExample, setStrengthExample] = React.useState("");
  const [developmentAreas, setDevelopmentAreas] = React.useState("");
  const [notes, setNotes] = React.useState("");

  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!token) {
      setLoadError("missing_token");
      return;
    }
    fetch(`/api/public/referee?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "error");
        }
        return res.json();
      })
      .then(setData)
      .catch((err) => setLoadError(err.message));
  }, [token]);

  if (loadError === "missing_token" || loadError === "expired") {
    return (
      <FormShell title="Link expired" subtitle="This reference check link is no longer valid.">
        <FormMessage>
          <p>This link has expired or is invalid. Please contact the recruitment team for a new one.</p>
          <p>
            Email: <a className="text-penda-teal underline" href="mailto:ta@penda.co.ke">ta@penda.co.ke</a>
          </p>
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
        <p className="text-sm text-muted-foreground">Loading reference check details…</p>
      </FormShell>
    );
  }

  if (submitted) {
    return (
      <FormShell title="Thank you" subtitle={`Hi ${data.refereeName}`}>
        <FormMessage>
          <p>Your reference for {data.candidateName} has been submitted. We appreciate your time.</p>
        </FormMessage>
      </FormShell>
    );
  }

  if (data.alreadySubmitted) {
    return (
      <FormShell title="Already submitted" subtitle={`Hi ${data.refereeName}`}>
        <FormMessage>
          <p>
            You&apos;ve already submitted a reference for {data.candidateName}. Contact{" "}
            <a className="text-penda-teal underline" href="mailto:ta@penda.co.ke">ta@penda.co.ke</a> if you need to make a
            correction.
          </p>
        </FormMessage>
      </FormShell>
    );
  }

  const allScored = SCORE_CRITERIA.every((c) => scores[c.key] > 0);
  const canSubmit =
    relationship && durationKnown && allScored && wouldRehire && strengthExample.trim().length >= 50;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/referee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          relationship,
          durationKnown,
          ...scores,
          wouldRehire,
          strengthExample,
          developmentAreas: developmentAreas || undefined,
          notes: notes || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body.error === "already_submitted" ? "This reference has already been submitted." : "Something went wrong. Please try again."
        );
      }
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormShell
      title="Reference check"
      subtitle={`Hi ${data.refereeName}, ${data.candidateName} listed you as a reference for the ${data.roleTitle} role at Penda Health.`}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label>How do you know {data.candidateName}?</Label>
          <Select value={relationship} onValueChange={setRelationship}>
            <SelectTrigger>
              <SelectValue placeholder="Select relationship" />
            </SelectTrigger>
            <SelectContent>
              {RELATIONSHIPS.map((r) => (
                <SelectItem key={r} value={r}>
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>How long have you known them?</Label>
          <Select value={durationKnown} onValueChange={setDurationKnown}>
            <SelectTrigger>
              <SelectValue placeholder="Select duration" />
            </SelectTrigger>
            <SelectContent>
              {DURATIONS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-4">
          {SCORE_CRITERIA.map((c) => (
            <div key={c.key} className="flex items-center justify-between">
              <Label>{c.label}</Label>
              <StarRating value={scores[c.key]} onChange={(v) => setScores((s) => ({ ...s, [c.key]: v }))} />
            </div>
          ))}
        </div>

        <div className="space-y-2">
          <Label>Would you rehire {data.candidateName}?</Label>
          <div className="space-y-2">
            {REHIRE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setWouldRehire(opt.value)}
                className={`w-full text-left rounded-lg border p-3 transition-colors ${
                  wouldRehire === opt.value ? "border-penda-teal bg-penda-teal/5" : "border-border hover:border-penda-teal/50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="strength">
            Describe a specific example of their strengths (min. 50 characters)
          </Label>
          <Textarea
            id="strength"
            required
            value={strengthExample}
            onChange={(e) => setStrengthExample(e.target.value)}
            rows={4}
          />
          <p className="text-xs text-muted-foreground">{strengthExample.length}/50 characters minimum</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="development">Any areas for development? (optional)</Label>
          <Textarea id="development" value={developmentAreas} onChange={(e) => setDevelopmentAreas(e.target.value)} rows={3} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Additional notes (optional)</Label>
          <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </div>

        {submitError && <p className="text-sm text-destructive">{submitError}</p>}

        <Button type="submit" className="w-full bg-penda-teal hover:bg-penda-teal-dark" disabled={!canSubmit || submitting}>
          {submitting ? "Submitting…" : "Submit reference"}
        </Button>
      </form>
    </FormShell>
  );
}

export default function RefereePage() {
  return (
    <React.Suspense fallback={null}>
      <RefereeForm />
    </React.Suspense>
  );
}
