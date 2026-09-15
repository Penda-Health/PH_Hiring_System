"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormShell, FormStatusCard, DraftRestoredBanner, type FormShellBrand } from "@/components/forms/form-shell";
import { loadDraft, saveDraft, clearDraft } from "@/lib/forms/work-trial-draft";

const BRAND: FormShellBrand = {
  headline: "A short trial, a real look at life at Penda.",
  lede: "It's usually just one day — enough for us to see your skills in action, and for you to get a feel for the team.",
  stats: [
    { value: "1 day", label: "Typical length" },
    { value: "KES 1,000", label: "Reimbursed post-onboarding" },
  ],
  footer: "Questions? careers@pendahealth.com",
};

type Branch = { id: string; name: string; city: string; branchManager: string };
type FormData = {
  candidateName: string;
  roleTitle: string;
  alreadySubmitted: boolean;
  selectedBranchName?: string;
  selectedDate?: string;
  branches: Branch[];
};

function minMaxDate() {
  const min = new Date();
  min.setDate(min.getDate() + 3);
  const max = new Date();
  max.setDate(max.getDate() + 14);
  return { min: min.toISOString().slice(0, 10), max: max.toISOString().slice(0, 10) };
}

function isWeekend(dateStr: string) {
  const day = new Date(`${dateStr}T00:00:00`).getDay();
  return day === 0 || day === 6;
}

function WorkTrialForm() {
  const token = useSearchParams().get("token");
  const [data, setData] = React.useState<FormData | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [branchId, setBranchId] = React.useState("");
  const [date, setDate] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [dateError, setDateError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [draftRestored, setDraftRestored] = React.useState(false);

  React.useEffect(() => {
    if (!token) {
      setLoadError("missing_token");
      return;
    }
    fetch(`/api/public/work-trial?token=${encodeURIComponent(token)}`)
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
          clearDraft(token); // Already confirmed — any local draft is stale.
          return;
        }
        const draft = loadDraft(token);
        if (draft) {
          setBranchId(draft.branchId);
          setDate(draft.date);
          setNotes(draft.notes);
          setDraftRestored(true);
        }
      })
      .catch((err) => setLoadError(err.message));
  }, [token]);

  // Debounced autosave — only while there's an actual form to fill in
  // (loaded, not yet submitted, and a branch to choose from).
  React.useEffect(() => {
    if (!token || !data || submitted || data.alreadySubmitted || data.branches.length === 0) return;
    const handle = setTimeout(() => {
      saveDraft(token, { branchId, date, notes });
    }, 500);
    return () => clearTimeout(handle);
  }, [token, data, submitted, branchId, date, notes]);

  function discardDraftAndRestart() {
    if (token) clearDraft(token);
    setDraftRestored(false);
    setBranchId("");
    setDate("");
    setNotes("");
  }

  if (loadError === "missing_token" || loadError === "expired") {
    return (
      <FormShell brand={BRAND}>
        <FormStatusCard variant="warning" title="Link expired" subtitle="This work trial link is no longer valid.">
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
        <FormStatusCard variant="error" title="Something went wrong" subtitle="We couldn't load your work trial details.">
          <p>Please try again later, or contact <a className="text-penda-blue underline" href="mailto:careers@pendahealth.com">careers@pendahealth.com</a>.</p>
        </FormStatusCard>
      </FormShell>
    );
  }

  if (!data) {
    return (
      <FormShell brand={BRAND}>
        <FormStatusCard variant="loading" title="Loading…" subtitle="Loading your work trial details." />
      </FormShell>
    );
  }

  if (submitted) {
    return (
      <FormShell brand={BRAND}>
        <FormStatusCard variant="success" title="You're all set!" subtitle={`Hi ${data.candidateName}, thank you for confirming.`}>
          <p>
            Your work trial is confirmed for <strong>{date}</strong> at{" "}
            <strong>{data.branches.find((b) => b.id === branchId)?.name}</strong>.
          </p>
          <p>You&apos;ll receive a confirmation email shortly. If you need to make changes, contact careers@pendahealth.com.</p>
        </FormStatusCard>
      </FormShell>
    );
  }

  if (data.alreadySubmitted) {
    return (
      <FormShell brand={BRAND}>
        <FormStatusCard variant="info" title="Already confirmed" subtitle={`Hi ${data.candidateName}`}>
          <p>
            You&apos;ve already selected your work trial: <strong>{data.selectedDate}</strong> at{" "}
            <strong>{data.selectedBranchName}</strong>.
          </p>
          <p>
            Check your email for confirmation. To make changes, contact{" "}
            <a className="text-penda-blue underline" href="mailto:careers@pendahealth.com">careers@pendahealth.com</a>.
          </p>
        </FormStatusCard>
      </FormShell>
    );
  }

  if (data.branches.length === 0) {
    return (
      <FormShell brand={BRAND}>
        <FormStatusCard variant="warning" title="No branches available" subtitle={`Hi ${data.candidateName}`}>
          <p>Please contact <a className="text-penda-blue underline" href="mailto:careers@pendahealth.com">careers@pendahealth.com</a> to arrange your work trial date.</p>
        </FormStatusCard>
      </FormShell>
    );
  }

  const { min, max } = minMaxDate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isWeekend(date)) {
      setDateError("Please pick a weekday (Mon–Fri).");
      return;
    }
    setDateError(null);
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/work-trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, branchId, date, notes: notes || undefined }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error === "already_submitted" ? "You've already submitted this form." : "Something went wrong. Please try again.");
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
    <FormShell brand={BRAND}
      title="Confirm your work trial"
      subtitle={`Hi ${data.candidateName}, we're excited to move you forward for the ${data.roleTitle} role.`}
    >
      <div className="space-y-6">
        <p className="text-sm text-foreground/80">
          A work trial is a short opportunity to work alongside our team at one of our branches so we can see
          your skills in action — and so you can get a feel for life at Penda Health. It usually lasts a single
          day, and we reimburse KES 1,000 post-onboarding for transport, lunch, and other costs on the day.
          Please pick the branch and date that work best for you below.
        </p>

        {draftRestored && <DraftRestoredBanner onDiscard={discardDraftAndRestart} />}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label>Choose a branch</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data.branches.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBranchId(b.id)}
                  className={`text-left rounded-lg border p-3 transition-colors ${
                    branchId === b.id ? "border-penda-blue bg-penda-blue/5" : "border-border hover:border-penda-blue/50"
                  }`}
                >
                  <p className="font-medium">{b.name}</p>
                  <p className="text-xs text-muted-foreground">{b.city}</p>
                  {b.branchManager && <p className="text-xs text-muted-foreground">Manager: {b.branchManager}</p>}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Preferred date</Label>
            <input
              id="date"
              type="date"
              required
              min={min}
              max={max}
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setDateError(null);
              }}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            {dateError && <p className="text-sm text-destructive">{dateError}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Anything we should know? (optional)</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>

          {submitError && <p className="text-sm text-destructive">{submitError}</p>}

          <Button
            type="submit"
            className="w-full bg-penda-blue hover:bg-penda-blue-dark"
            disabled={!branchId || !date || submitting}
          >
            {submitting ? "Submitting…" : "Confirm my work trial"}
          </Button>
        </form>
      </div>
    </FormShell>
  );
}

export default function WorkTrialPage() {
  return (
    <React.Suspense fallback={null}>
      <WorkTrialForm />
    </React.Suspense>
  );
}
