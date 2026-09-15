"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormShell, FormStatusCard, DraftRestoredBanner, type FormShellBrand } from "@/components/forms/form-shell";
import { Plus, X } from "lucide-react";
import { loadDraft, saveDraft, clearDraft } from "@/lib/forms/reference-check-request-draft";

const BRAND: FormShellBrand = {
  eyebrow: "Penda Health · Reference Check",
  headline: "Tell us who can speak to your work.",
  lede: "2 to 4 people who've worked with you — a manager, a senior colleague, a peer. We'll reach out to them directly.",
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
const MIN_REFEREES = 2;
const MAX_REFEREES = 4;

function isCompleteReferee(r: RefereeInput) {
  return r.name.trim().length > 0 && EMAIL_RE.test(r.email.trim()) && r.phone.trim().length > 0;
}

function RefereeFieldset({
  label,
  value,
  onChange,
  onRemove,
}: {
  label: string;
  value: RefereeInput;
  onChange: (v: RefereeInput) => void;
  onRemove?: () => void;
}) {
  return (
    <fieldset className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between px-1">
        <legend className="text-sm font-medium">{label}</legend>
        {onRemove && (
          <button type="button" onClick={onRemove} aria-label={`Remove ${label}`} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
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

  const [referees, setReferees] = React.useState<RefereeInput[]>([{ ...EMPTY_REFEREE }, { ...EMPTY_REFEREE }]);

  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [draftRestored, setDraftRestored] = React.useState(false);

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
      .then((body: FormData) => {
        setData(body);
        if (body.alreadySubmitted) {
          clearDraft(token); // Already submitted — any local draft is stale.
          return;
        }
        const draft = loadDraft(token);
        if (draft) {
          setReferees(draft.referees);
          setDraftRestored(true);
        }
      })
      .catch((err) => setLoadError(err.message));
  }, [token]);

  // Debounced autosave — only once there's something worth restoring (skip
  // the default two-blank-referee state so the banner doesn't fire on a
  // completely untouched form).
  React.useEffect(() => {
    if (!token || !data || submitted || data.alreadySubmitted) return;
    const hasContent = referees.some((r) => r.name.trim() || r.email.trim() || r.phone.trim());
    if (!hasContent) return;
    const handle = setTimeout(() => {
      saveDraft(token, { referees });
    }, 500);
    return () => clearTimeout(handle);
  }, [token, data, submitted, referees]);

  function discardDraftAndRestart() {
    if (token) clearDraft(token);
    setDraftRestored(false);
    setReferees([{ ...EMPTY_REFEREE }, { ...EMPTY_REFEREE }]);
  }

  if (loadError === "missing_token" || loadError === "expired") {
    return (
      <FormShell brand={BRAND}>
        <FormStatusCard variant="warning" title="Link expired" subtitle="This link is no longer valid.">
          <p>This link has expired or is invalid. Please contact the recruitment team for a new one.</p>
          <p>
            Email: <a className="text-penda-blue underline" href="mailto:careers@pendahealth.com">careers@pendahealth.com</a>
          </p>
        </FormStatusCard>
      </FormShell>
    );
  }

  if (loadError) {
    return (
      <FormShell brand={BRAND}>
        <FormStatusCard variant="error" title="Something went wrong">
          <p>Please try again later, or contact <a className="text-penda-blue underline" href="mailto:careers@pendahealth.com">careers@pendahealth.com</a>.</p>
        </FormStatusCard>
      </FormShell>
    );
  }

  if (!data) {
    return (
      <FormShell brand={BRAND}>
        <FormStatusCard variant="loading" title="Loading…" subtitle="Just a moment." />
      </FormShell>
    );
  }

  if (submitted) {
    return (
      <FormShell brand={BRAND}>
        <FormStatusCard variant="success" title="Thank you" subtitle={data.candidateName}>
          <p>We&apos;ve got your referees&apos; details. Our team will review and reach out to them shortly.</p>
        </FormStatusCard>
      </FormShell>
    );
  }

  if (data.alreadySubmitted) {
    return (
      <FormShell brand={BRAND}>
        <FormStatusCard variant="info" title="Already submitted" subtitle={data.candidateName}>
          <p>
            We already have referee details on file for you. Contact{" "}
            <a className="text-penda-blue underline" href="mailto:careers@pendahealth.com">careers@pendahealth.com</a> if you need to make a
            correction.
          </p>
        </FormStatusCard>
      </FormShell>
    );
  }

  const emails = referees.map((r) => r.email.trim().toLowerCase());
  const distinctEmails = new Set(emails).size === emails.length;
  const canSubmit = referees.every(isCompleteReferee) && distinctEmails;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/reference-check-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, referees }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          body.error === "already_submitted" ? "You've already submitted referee details." : "Something went wrong. Please try again."
        );
      }
      if (token) clearDraft(token);
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
      subtitle={`Hi ${data.candidateName}, please share 2 to 4 people we can contact about your work${data.roleTitle ? ` for the ${data.roleTitle} role` : ""}.`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {draftRestored && <DraftRestoredBanner onDiscard={discardDraftAndRestart} />}
        {!distinctEmails && referees.every((r) => r.email) && (
          <p className="text-sm text-destructive">Please use a different email address for each referee.</p>
        )}
        {referees.map((referee, i) => (
          <RefereeFieldset
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
            className="w-full"
            onClick={() => setReferees((prev) => [...prev, { ...EMPTY_REFEREE }])}
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add another referee
          </Button>
        )}

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
