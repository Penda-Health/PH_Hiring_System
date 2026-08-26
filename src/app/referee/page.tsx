"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormShell, FormMessage, type FormShellBrand } from "@/components/forms/form-shell";
import { FormattableTextarea } from "@/components/forms/formattable-textarea";
import { GoogleSignInButton } from "@/components/forms/google-sign-in-button";
import { WRITTEN_ASSESSMENT_MIN_LENGTH } from "@/lib/work-trial-helpers";

const BRAND: FormShellBrand = {
  eyebrow: "Penda Health · Reference Check",
  headline: "A few honest minutes from you helps us get this hire right.",
  lede: "You were listed as a reference — your perspective on their work is one of the most valuable inputs we get.",
  footer: "Questions? careers@pendahealth.com",
};

type FormData = {
  candidateName: string;
  roleTitle: string;
  refereeName: string;
  refereeEmail: string;
  alreadySubmitted: boolean;
  googleVerified: boolean;
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
          className={`text-2xl leading-none transition-colors ${n <= value ? "text-penda-blue" : "text-muted-foreground/30"}`}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

// Required until a matching Google sign-in (or a later TA override) is on
// file for this referee slot — see src/lib/forms/google-verify.ts for why
// this can't reuse the staff Supabase OAuth flow.
function GoogleVerificationStep({
  token,
  data,
  onVerified,
}: {
  token: string;
  data: FormData;
  onVerified: () => void;
}) {
  const [checking, setChecking] = React.useState(false);
  const [mismatch, setMismatch] = React.useState<{ googleEmail: string } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function handleCredential(credential: string) {
    setChecking(true);
    setError(null);
    setMismatch(null);
    try {
      const res = await fetch("/api/public/referee/verify-google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, credential }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error === "invalid_google_token" ? "Couldn't verify that Google account. Please try again." : "Something went wrong. Please try again.");
      }
      if (body.verified) {
        onVerified();
      } else {
        setMismatch({ googleEmail: body.googleEmail });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="space-y-4 rounded-lg border border-border bg-muted/30 p-4">
      <div>
        <p className="text-sm font-medium">Verify it&apos;s really you</p>
        <p className="text-sm text-muted-foreground">
          To keep reference checks trustworthy, please sign in with the Google account matching{" "}
          <span className="font-medium text-foreground">{data.refereeEmail}</span> before continuing.
        </p>
      </div>

      {mismatch && (
        <FormMessage>
          <p>
            You signed in as <span className="font-medium">{mismatch.googleEmail}</span>, but we have{" "}
            <span className="font-medium">{data.refereeEmail}</span> on file for this reference. Try signing in with a
            different Google account below, or email{" "}
            <a className="text-penda-blue underline" href="mailto:careers@pendahealth.com">
              careers@pendahealth.com
            </a>{" "}
            if that&apos;s the correct address for you and it just doesn&apos;t match what {data.candidateName} gave us.
          </p>
        </FormMessage>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <GoogleSignInButton onCredential={handleCredential} disabled={checking} />
      {checking && <p className="text-xs text-muted-foreground">Verifying…</p>}
    </div>
  );
}

function RefereeForm() {
  const token = useSearchParams().get("token");
  const [data, setData] = React.useState<FormData | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [googleVerified, setGoogleVerified] = React.useState(false);

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
      .then((body: FormData) => {
        setData(body);
        setGoogleVerified(body.googleVerified);
      })
      .catch((err) => setLoadError(err.message));
  }, [token]);

  if (loadError === "missing_token" || loadError === "expired") {
    return (
      <FormShell brand={BRAND} title="Link expired" subtitle="This reference check link is no longer valid.">
        <FormMessage>
          <p>This link has expired or is invalid. Please contact the recruitment team for a new one.</p>
          <p>
            Email: <a className="text-penda-blue underline" href="mailto:careers@pendahealth.com">careers@pendahealth.com</a>
          </p>
        </FormMessage>
      </FormShell>
    );
  }

  if (loadError) {
    return (
      <FormShell brand={BRAND} title="Something went wrong">
        <FormMessage>
          <p>Please try again later, or contact <a className="text-penda-blue underline" href="mailto:careers@pendahealth.com">careers@pendahealth.com</a>.</p>
        </FormMessage>
      </FormShell>
    );
  }

  if (!data) {
    return (
      <FormShell brand={BRAND} title="Loading…">
        <p className="text-sm text-muted-foreground">Loading reference check details…</p>
      </FormShell>
    );
  }

  if (submitted) {
    return (
      <FormShell brand={BRAND} title="Thank you" subtitle={`Hi ${data.refereeName}`}>
        <FormMessage>
          <p>Your reference for {data.candidateName} has been submitted. We appreciate your time.</p>
        </FormMessage>
      </FormShell>
    );
  }

  if (data.alreadySubmitted) {
    return (
      <FormShell brand={BRAND} title="Already submitted" subtitle={`Hi ${data.refereeName}`}>
        <FormMessage>
          <p>
            You&apos;ve already submitted a reference for {data.candidateName}. Contact{" "}
            <a className="text-penda-blue underline" href="mailto:careers@pendahealth.com">careers@pendahealth.com</a> if you need to make a
            correction.
          </p>
        </FormMessage>
      </FormShell>
    );
  }

  const allScored = SCORE_CRITERIA.every((c) => scores[c.key] > 0);
  const canSubmit =
    googleVerified &&
    relationship &&
    durationKnown &&
    allScored &&
    wouldRehire &&
    strengthExample.trim().length >= WRITTEN_ASSESSMENT_MIN_LENGTH &&
    developmentAreas.trim().length >= WRITTEN_ASSESSMENT_MIN_LENGTH;

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
          developmentAreas,
          notes: notes || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body.error === "already_submitted"
            ? "This reference has already been submitted."
            : body.error === "google_verification_required"
              ? "Please verify with Google before submitting."
              : "Something went wrong. Please try again."
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
    <FormShell brand={BRAND}
      title="Reference check"
      subtitle={`Hi ${data.refereeName}, ${data.candidateName} listed you as a reference for the ${data.roleTitle} role at Penda Health.`}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {!googleVerified && token && (
          <GoogleVerificationStep token={token} data={data} onVerified={() => setGoogleVerified(true)} />
        )}
        {googleVerified && (
          <p className="text-xs text-muted-foreground">✓ Identity verified with Google.</p>
        )}

        <fieldset disabled={!googleVerified} className="space-y-6 disabled:opacity-40">
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
                    wouldRehire === opt.value ? "border-penda-blue bg-penda-blue/5" : "border-border hover:border-penda-blue/50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="strength">Describe a specific example of their strengths</Label>
            <FormattableTextarea
              id="strength"
              required
              minLength={WRITTEN_ASSESSMENT_MIN_LENGTH}
              value={strengthExample}
              onChange={setStrengthExample}
              rows={5}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="development">What&apos;s one area they could keep developing?</Label>
            <FormattableTextarea
              id="development"
              required
              minLength={WRITTEN_ASSESSMENT_MIN_LENGTH}
              value={developmentAreas}
              onChange={setDevelopmentAreas}
              rows={5}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional notes (optional)</Label>
            <FormattableTextarea id="notes" value={notes} onChange={setNotes} rows={3} />
          </div>
        </fieldset>

        {submitError && <p className="text-sm text-destructive">{submitError}</p>}

        <Button type="submit" className="w-full bg-penda-blue hover:bg-penda-blue-dark" disabled={!canSubmit || submitting}>
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
