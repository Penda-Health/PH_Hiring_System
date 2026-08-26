"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormShell, FormMessage, type FormShellBrand } from "@/components/forms/form-shell";

const BRAND: FormShellBrand = {
  eyebrow: "Penda Health · Reference Check",
  headline: "Tell us who can speak to your work.",
  lede: "Two people who've worked with you — a manager, a senior colleague, a peer. We'll reach out to them directly.",
  footer: "Questions? careers@pendahealth.com",
};

type FormData = {
  candidateName: string;
  roleTitle: string;
  alreadySubmitted: boolean;
};

type RefereeInput = { name: string; email: string; phone: string };
const EMPTY_REFEREE: RefereeInput = { name: "", email: "", phone: "" };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isCompleteReferee(r: RefereeInput) {
  return r.name.trim().length > 0 && EMAIL_RE.test(r.email.trim()) && r.phone.trim().length > 0;
}

function RefereeFieldset({
  label,
  value,
  onChange,
}: {
  label: string;
  value: RefereeInput;
  onChange: (v: RefereeInput) => void;
}) {
  return (
    <fieldset className="space-y-3 rounded-lg border border-border p-4">
      <legend className="px-1 text-sm font-medium">{label}</legend>
      <div className="space-y-1.5">
        <Label>Full name</Label>
        <Input value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} placeholder="Full name" required />
      </div>
      <div className="space-y-1.5">
        <Label>Email</Label>
        <Input
          type="email"
          value={value.email}
          onChange={(e) => onChange({ ...value, email: e.target.value })}
          placeholder="referee@example.com"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label>Phone</Label>
        <Input value={value.phone} onChange={(e) => onChange({ ...value, phone: e.target.value })} placeholder="+254…" required />
      </div>
    </fieldset>
  );
}

function ReferenceCheckRequestForm() {
  const token = useSearchParams().get("token");
  const [data, setData] = React.useState<FormData | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [referee1, setReferee1] = React.useState<RefereeInput>(EMPTY_REFEREE);
  const [referee2, setReferee2] = React.useState<RefereeInput>(EMPTY_REFEREE);

  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!token) {
      setLoadError("missing_token");
      return;
    }
    fetch(`/api/public/reference-check-request?token=${encodeURIComponent(token)}`)
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
      <FormShell brand={BRAND} title="Link expired" subtitle="This link is no longer valid.">
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
        <p className="text-sm text-muted-foreground">Loading…</p>
      </FormShell>
    );
  }

  if (submitted) {
    return (
      <FormShell brand={BRAND} title="Thank you" subtitle={data.candidateName}>
        <FormMessage>
          <p>We&apos;ve got your referees&apos; details. Our team will review and reach out to them shortly.</p>
        </FormMessage>
      </FormShell>
    );
  }

  if (data.alreadySubmitted) {
    return (
      <FormShell brand={BRAND} title="Already submitted" subtitle={data.candidateName}>
        <FormMessage>
          <p>
            We already have referee details on file for you. Contact{" "}
            <a className="text-penda-blue underline" href="mailto:careers@pendahealth.com">careers@pendahealth.com</a> if you need to make a
            correction.
          </p>
        </FormMessage>
      </FormShell>
    );
  }

  const distinctEmails = referee1.email.trim().toLowerCase() !== referee2.email.trim().toLowerCase();
  const canSubmit = isCompleteReferee(referee1) && isCompleteReferee(referee2) && distinctEmails;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/reference-check-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, referee1, referee2 }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body.error === "already_submitted" ? "You've already submitted referee details." : "Something went wrong. Please try again."
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
      brand={BRAND}
      title="Add your referees"
      subtitle={`Hi ${data.candidateName}, please share two people we can contact about your work${data.roleTitle ? ` for the ${data.roleTitle} role` : ""}.`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {!distinctEmails && referee1.email && referee2.email && (
          <p className="text-sm text-destructive">Please use two different email addresses for your referees.</p>
        )}
        <RefereeFieldset label="Referee 1" value={referee1} onChange={setReferee1} />
        <RefereeFieldset label="Referee 2" value={referee2} onChange={setReferee2} />

        {submitError && <p className="text-sm text-destructive">{submitError}</p>}

        <Button type="submit" className="w-full bg-penda-blue hover:bg-penda-blue-dark" disabled={!canSubmit || submitting}>
          {submitting ? "Submitting…" : "Submit"}
        </Button>
      </form>
    </FormShell>
  );
}

export default function ReferenceCheckRequestPage() {
  return (
    <React.Suspense fallback={null}>
      <ReferenceCheckRequestForm />
    </React.Suspense>
  );
}
