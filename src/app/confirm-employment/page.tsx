"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { FormShell, FormMessage } from "@/components/forms/form-shell";

type FormData = {
  employeeName: string;
  role: string;
  startDate: string;
  alreadySubmitted: boolean;
};

function ConfirmEmploymentForm() {
  const token = useSearchParams().get("token");
  const [data, setData] = React.useState<FormData | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [confirmedValue, setConfirmedValue] = React.useState<boolean | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!token) {
      setLoadError("missing_token");
      return;
    }
    fetch(`/api/public/confirm-employment?token=${encodeURIComponent(token)}`)
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
      <FormShell title="Link expired" subtitle="This confirmation link is no longer valid.">
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
      <FormShell title="Something went wrong" subtitle="We couldn't load this confirmation request.">
        <FormMessage>
          <p>Please try again later, or contact <a className="text-penda-teal underline" href="mailto:ta@penda.co.ke">ta@penda.co.ke</a>.</p>
        </FormMessage>
      </FormShell>
    );
  }

  if (!data) {
    return (
      <FormShell title="Loading…">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </FormShell>
    );
  }

  if (submitted) {
    return (
      <FormShell title="Thank you" subtitle="Your response has been recorded.">
        <FormMessage>
          <p>{confirmedValue ? `Thanks for confirming ${data.employeeName} is still employed.` : "Thanks for letting us know."}</p>
        </FormMessage>
      </FormShell>
    );
  }

  if (data.alreadySubmitted) {
    return (
      <FormShell title="Already responded" subtitle={`Confirmation for ${data.employeeName}`}>
        <FormMessage>
          <p>This confirmation has already been recorded. Contact <a className="text-penda-teal underline" href="mailto:ta@penda.co.ke">ta@penda.co.ke</a> with any questions.</p>
        </FormMessage>
      </FormShell>
    );
  }

  async function handleSubmit(confirmed: boolean) {
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/confirm-employment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, confirmed }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error === "already_submitted" ? "This has already been confirmed." : "Something went wrong. Please try again.");
      }
      setConfirmedValue(confirmed);
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <FormShell
      title="6-Month Employment Confirmation"
      subtitle={`${data.employeeName} — ${data.role}, started ${data.startDate}`}
    >
      <div className="space-y-6">
        <p className="text-sm text-foreground/80">
          It&apos;s been about 6 months since this hire joined. Please confirm whether they are still employed at Penda Health.
        </p>

        {submitError && <p className="text-sm text-destructive">{submitError}</p>}

        <div className="flex gap-3">
          <Button onClick={() => handleSubmit(true)} disabled={submitting} className="flex-1 bg-penda-teal hover:bg-penda-teal-dark">
            {submitting ? "Submitting…" : "Yes, still employed"}
          </Button>
          <Button onClick={() => handleSubmit(false)} disabled={submitting} variant="outline" className="flex-1">
            No
          </Button>
        </div>
      </div>
    </FormShell>
  );
}

export default function ConfirmEmploymentPage() {
  return (
    <React.Suspense fallback={null}>
      <ConfirmEmploymentForm />
    </React.Suspense>
  );
}
