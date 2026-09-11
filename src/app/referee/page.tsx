"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormShell, FormMessage, FormStatusCard, FormStepper, type FormShellBrand } from "@/components/forms/form-shell";
import { CheckCircle2 } from "lucide-react";
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
  recruiterName: string;
  segment: string;
  refereeName: string;
  refereeEmail: string;
  alreadySubmitted: boolean;
  googleVerified: boolean;
};

const RELATIONSHIPS = ["Direct manager", "Senior colleague", "Peer / colleague", "Client or patient", "Other professional"];
const DURATIONS = ["Less than 1 year", "1-2 years", "2-5 years", "5+ years"];
const REHIRE_OPTIONS = ["Yes, without hesitation", "Yes, with reservations", "No", "Unsure"] as const;
const HONESTY_OPTIONS = ["No concerns", "Some concerns", "Prefer to discuss by phone"] as const;
const COMPLIANCE_OPTIONS = ["None that I know of", "Yes", "Prefer to discuss by phone"] as const;
const LICENSE_OPTIONS = ["Yes", "No", "N/A", "Not sure"] as const;

const SCORE_CRITERIA = [
  { key: "techScore", label: "Technical / professional skills" },
  { key: "reliabilityScore", label: "Reliability & dependability" },
  { key: "teamworkScore", label: "Teamwork & collaboration" },
  { key: "problemSolvingScore", label: "Problem solving" },
  { key: "adaptabilityScore", label: "Adaptability" },
] as const;
type ScoreKey = (typeof SCORE_CRITERIA)[number]["key"];

const PREFERS_PHONE = "Prefer to discuss by phone";

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

/** A row of mutually-exclusive text buttons — the same visual pattern already used for wouldRehire/urgency-style choices across the public forms, generalized so it isn't rewritten per field. */
function OptionButtons<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T | "";
  onChange: (v: T) => void;
}) {
  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left text-sm transition-colors ${
            value === opt ? "border-penda-blue bg-penda-blue/5" : "border-border hover:border-penda-blue/50"
          }`}
        >
          <span>{opt}</span>
          {value === opt && <CheckCircle2 className="h-4 w-4 shrink-0 text-penda-blue" />}
        </button>
      ))}
    </div>
  );
}

function YesNoToggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {[
        { label: "Yes", v: true },
        { label: "No", v: false },
      ].map((opt) => (
        <button
          key={opt.label}
          type="button"
          onClick={() => onChange(opt.v)}
          className={`rounded-md border px-3 py-2 text-sm transition-colors ${
            value === opt.v ? "border-penda-blue bg-penda-blue/5" : "border-border hover:border-penda-blue/50"
          }`}
        >
          {opt.label}
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

  // 0 = intro/landing (not counted in the stepper), 1 = verify, 2-4 = the wizard steps.
  const [screen, setScreen] = React.useState<0 | 1 | 2 | 3 | 4>(0);

  const [relationship, setRelationship] = React.useState("");
  const [directlySupervised, setDirectlySupervised] = React.useState<boolean | null>(null);
  const [durationKnown, setDurationKnown] = React.useState("");
  const [employmentFrom, setEmploymentFrom] = React.useState("");
  const [employmentTo, setEmploymentTo] = React.useState("");
  const [stillEmployed, setStillEmployed] = React.useState<boolean | null>(null);
  const [scores, setScores] = React.useState<Record<ScoreKey, number>>({
    techScore: 0,
    reliabilityScore: 0,
    teamworkScore: 0,
    problemSolvingScore: 0,
    adaptabilityScore: 0,
  });

  const [strengthsAndDevelopment, setStrengthsAndDevelopment] = React.useState("");
  const [conflictExample, setConflictExample] = React.useState("");
  const [honestyConcerns, setHonestyConcerns] = React.useState<(typeof HONESTY_OPTIONS)[number] | "">("");
  const [complianceIncidents, setComplianceIncidents] = React.useState<(typeof COMPLIANCE_OPTIONS)[number] | "">("");
  const [licenseStanding, setLicenseStanding] = React.useState<(typeof LICENSE_OPTIONS)[number] | "">("");
  const [preferPhoneNumber, setPreferPhoneNumber] = React.useState("");

  const [wouldRehire, setWouldRehire] = React.useState<(typeof REHIRE_OPTIONS)[number] | "">("");
  const [overallRecommendScore, setOverallRecommendScore] = React.useState(0);
  const [notes, setNotes] = React.useState("");
  const [consentToContact, setConsentToContact] = React.useState<boolean | null>(null);

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
        // A refresh mid-flow shouldn't re-ask someone who already verified.
        if (body.googleVerified) setScreen(2);
      })
      .catch((err) => setLoadError(err.message));
  }, [token]);

  if (loadError === "missing_token" || loadError === "expired") {
    return (
      <FormShell brand={BRAND}>
        <FormStatusCard variant="warning" title="Link expired" subtitle="This reference check link is no longer valid.">
          <p>This link has expired or is invalid. Please contact the recruitment team for a new one.</p>
          <p>
            Email:{" "}
            <a className="text-penda-blue underline" href="mailto:careers@pendahealth.com">
              careers@pendahealth.com
            </a>
          </p>
        </FormStatusCard>
      </FormShell>
    );
  }

  if (loadError) {
    return (
      <FormShell brand={BRAND}>
        <FormStatusCard variant="error" title="Something went wrong">
          <p>
            Please try again later, or contact{" "}
            <a className="text-penda-blue underline" href="mailto:careers@pendahealth.com">
              careers@pendahealth.com
            </a>
            .
          </p>
        </FormStatusCard>
      </FormShell>
    );
  }

  if (!data) {
    return (
      <FormShell brand={BRAND}>
        <FormStatusCard variant="loading" title="Loading your reference check…" subtitle="Just a moment." />
      </FormShell>
    );
  }

  if (submitted) {
    return (
      <FormShell brand={BRAND}>
        <FormStatusCard variant="success" title="Thank you" subtitle={`Hi ${data.refereeName}`}>
          <p>Your reference for {data.candidateName} has been submitted. We appreciate your time.</p>
        </FormStatusCard>
      </FormShell>
    );
  }

  if (data.alreadySubmitted) {
    return (
      <FormShell brand={BRAND}>
        <FormStatusCard variant="info" title="Already submitted" subtitle={`Hi ${data.refereeName}`}>
          <p>
            You&apos;ve already submitted a reference for {data.candidateName}. Contact{" "}
            <a className="text-penda-blue underline" href="mailto:careers@pendahealth.com">
              careers@pendahealth.com
            </a>{" "}
            if you need to make a correction.
          </p>
        </FormStatusCard>
      </FormShell>
    );
  }

  const isClinical = data.segment === "IPS";
  const needsPhone = honestyConcerns === PREFERS_PHONE || complianceIncidents === PREFERS_PHONE;

  const allScored = SCORE_CRITERIA.every((c) => scores[c.key] > 0);
  const canContinueStep2 =
    relationship && directlySupervised !== null && durationKnown && employmentFrom && (stillEmployed || employmentTo) && stillEmployed !== null && allScored;
  const canContinueStep3 =
    strengthsAndDevelopment.trim().length >= WRITTEN_ASSESSMENT_MIN_LENGTH &&
    conflictExample.trim().length > 0 &&
    honestyConcerns &&
    (!isClinical || (complianceIncidents && licenseStanding)) &&
    (!needsPhone || preferPhoneNumber.trim().length > 0);
  const canSubmit = wouldRehire && overallRecommendScore > 0 && consentToContact !== null;

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
          directlySupervised,
          durationKnown,
          employmentFrom,
          employmentTo: stillEmployed ? undefined : employmentTo,
          stillEmployed,
          ...scores,
          strengthsAndDevelopment,
          conflictExample,
          honestyConcerns,
          complianceIncidents: isClinical ? complianceIncidents : undefined,
          licenseStanding: isClinical ? licenseStanding : undefined,
          preferPhoneNumber: needsPhone ? preferPhoneNumber : undefined,
          wouldRehire,
          overallRecommendScore,
          consentToContact,
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

  // Screen 0 — intro/landing. Not part of the 4-step count; just orients the
  // referee before the wizard starts (who's asking, how long it'll take).
  if (screen === 0) {
    return (
      <FormShell brand={BRAND}
        title={`Hi ${data.refereeName}`}
        subtitle={`${data.candidateName} listed you as a reference for the ${data.roleTitle} role at Penda Health.`}
      >
        <div className="space-y-6">
          <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Candidate</span>
              <span className="font-medium text-foreground">{data.candidateName}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Role</span>
              <span className="font-medium text-foreground">{data.roleTitle}</span>
            </div>
            {data.recruiterName && (
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Requested by</span>
                <span className="font-medium text-foreground">{data.recruiterName}</span>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Time needed</span>
              <span className="font-medium text-foreground">About 5 minutes</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            You&apos;ll verify it&apos;s you with a quick Google sign-in, then answer a short set of questions across 4
            steps — your candid feedback stays confidential to Penda&apos;s hiring team.
          </p>
          <Button onClick={() => setScreen(1)} className="w-full bg-penda-blue hover:bg-penda-blue-dark">
            Start reference check
          </Button>
        </div>
      </FormShell>
    );
  }

  // Screen 1 — verify, and nothing else. Splitting this into its own screen
  // (rather than showing the questions greyed out behind a disabled
  // <fieldset>) isn't just presentation: a disabled fieldset only reliably
  // blocks *native* form controls, and the relationship/duration dropdowns
  // are Radix Select components that don't consistently inherit that
  // ambient disabled state across browsers — so they could look locked but
  // still be interactive. Not rendering the questions at all until verified
  // closes that gap by construction instead of patching each widget.
  if (screen === 1) {
    return (
      <FormShell brand={BRAND}
        title="Verify it's you"
        subtitle={`Hi ${data.refereeName}, ${data.candidateName} listed you as a reference for the ${data.roleTitle} role at Penda Health.`}
      >
        <div className="space-y-4">
          <FormStepper step={1} total={4} label="Verify it's you" />
          {token && <GoogleVerificationStep token={token} data={data} onVerified={() => setScreen(2)} />}
        </div>
      </FormShell>
    );
  }

  const verifiedNote = (
    <p className="flex items-center gap-1.5 text-xs text-success-fg">
      <CheckCircle2 className="h-3.5 w-3.5" />
      Identity verified with Google.
    </p>
  );

  // Screen 2 — relationship & ratings.
  if (screen === 2) {
    return (
      <FormShell brand={BRAND}
        title="Your relationship & ratings"
        subtitle={`Hi ${data.refereeName}, tell us how you know ${data.candidateName} and how they performed.`}
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <FormStepper step={2} total={4} label="Relationship & ratings" />
            {verifiedNote}
          </div>

          <div className="space-y-6">
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
              <Label>Did you directly supervise them?</Label>
              <YesNoToggle value={directlySupervised ?? false} onChange={setDirectlySupervised} />
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Employment started</Label>
                <Input type="month" value={employmentFrom} onChange={(e) => setEmploymentFrom(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Employment ended</Label>
                <Input
                  type="month"
                  value={employmentTo}
                  onChange={(e) => setEmploymentTo(e.target.value)}
                  disabled={!!stillEmployed}
                  placeholder={stillEmployed ? "Present" : undefined}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Are they still employed there?</Label>
              <YesNoToggle value={stillEmployed ?? false} onChange={setStillEmployed} />
            </div>

            <div className="space-y-2">
              <Label>Rate their work</Label>
              <div className="divide-y divide-border rounded-lg border border-border">
                {SCORE_CRITERIA.map((c) => (
                  <div key={c.key} className="flex items-center justify-between gap-4 px-4 py-3">
                    <span className="text-sm text-foreground">{c.label}</span>
                    <StarRating value={scores[c.key]} onChange={(v) => setScores((s) => ({ ...s, [c.key]: v }))} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => setScreen(1)} className="flex-1">
              Back
            </Button>
            <Button type="button" onClick={() => setScreen(3)} disabled={!canContinueStep2} className="flex-1 bg-penda-blue hover:bg-penda-blue-dark">
              Continue
            </Button>
          </div>
        </div>
      </FormShell>
    );
  }

  // Screen 3 — feedback & character.
  if (screen === 3) {
    return (
      <FormShell brand={BRAND}
        title="Feedback & character"
        subtitle={`A bit more detail on ${data.candidateName}'s work and conduct.`}
      >
        <div className="space-y-6">
          <div className="space-y-2">
            <FormStepper step={3} total={4} label="Feedback & character" />
            {verifiedNote}
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="strengths-dev">Describe their strengths, and one area they could keep developing</Label>
              <FormattableTextarea
                id="strengths-dev"
                required
                minLength={WRITTEN_ASSESSMENT_MIN_LENGTH}
                value={strengthsAndDevelopment}
                onChange={setStrengthsAndDevelopment}
                rows={5}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="conflict">How did they handle pressure, conflict, or a tough decision?</Label>
              <FormattableTextarea id="conflict" required value={conflictExample} onChange={setConflictExample} rows={4} />
            </div>

            <div className="space-y-2">
              <Label>Any concerns about their honesty or integrity?</Label>
              <OptionButtons options={HONESTY_OPTIONS} value={honestyConcerns} onChange={setHonestyConcerns} />
            </div>

            {isClinical && (
              <>
                <div className="space-y-2">
                  <Label>Any compliance incidents you&apos;re aware of?</Label>
                  <OptionButtons options={COMPLIANCE_OPTIONS} value={complianceIncidents} onChange={setComplianceIncidents} />
                </div>
                <div className="space-y-2">
                  <Label>Is their professional license/registration in good standing, to your knowledge?</Label>
                  <OptionButtons options={LICENSE_OPTIONS} value={licenseStanding} onChange={setLicenseStanding} />
                </div>
              </>
            )}

            {needsPhone && (
              <div className="space-y-2">
                <Label htmlFor="prefer-phone">Best number to reach you on</Label>
                <Input id="prefer-phone" value={preferPhoneNumber} onChange={(e) => setPreferPhoneNumber(e.target.value)} placeholder="+254…" />
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => setScreen(2)} className="flex-1">
              Back
            </Button>
            <Button type="button" onClick={() => setScreen(4)} disabled={!canContinueStep3} className="flex-1 bg-penda-blue hover:bg-penda-blue-dark">
              Continue
            </Button>
          </div>
        </div>
      </FormShell>
    );
  }

  // Screen 4 — recommendation & submit.
  return (
    <FormShell brand={BRAND}
      title="Your recommendation"
      subtitle={`Last step — your overall take on ${data.candidateName}.`}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <FormStepper step={4} total={4} label="Recommendation" />
          {verifiedNote}
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Would you rehire {data.candidateName}?</Label>
            <OptionButtons options={REHIRE_OPTIONS} value={wouldRehire} onChange={setWouldRehire} />
          </div>

          <div className="space-y-2">
            <Label>Overall, how would you rate them?</Label>
            <StarRating value={overallRecommendScore} onChange={setOverallRecommendScore} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional notes (optional)</Label>
            <FormattableTextarea id="notes" value={notes} onChange={setNotes} rows={3} />
          </div>

          <div className="space-y-2">
            <Label>OK to contact you again if we have follow-up questions?</Label>
            <YesNoToggle value={consentToContact ?? false} onChange={setConsentToContact} />
          </div>
        </div>

        {submitError && <p className="text-sm text-destructive">{submitError}</p>}

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={() => setScreen(3)} className="flex-1" disabled={submitting}>
            Back
          </Button>
          <Button type="submit" className="flex-1 bg-penda-blue hover:bg-penda-blue-dark" disabled={!canSubmit || submitting}>
            {submitting ? "Submitting…" : "Submit reference"}
          </Button>
        </div>
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
