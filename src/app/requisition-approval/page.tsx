"use client";

// The link in a requisition approver's email (minted by
// src/lib/requisitions/approval.ts). No app login needed, but the approver
// must sign in with the Google account named on their step before they can
// approve or reject — see /api/public/requisition-approval.
import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Check, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormShell, FormStatusCard, type FormShellBrand } from "@/components/forms/form-shell";
import { GoogleSignInButton } from "@/components/forms/google-sign-in-button";
import type { ApprovalView } from "@/lib/requisitions/approval";

const BRAND: FormShellBrand = {
  eyebrow: "Penda Health · Requisition Approval",
  headline: "Your sign-off moves this role forward.",
  lede: "Each approver signs in with their Penda Google account, so every decision is tied to the right person.",
  footer: "Questions? careers@pendahealth.com",
};

type LoadState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "ready"; view: ApprovalView; stepIndex: number; isCurrentStep: boolean; expectedEmail: string | null };

type Outcome = { decision: "Approved" | "Rejected"; status: string; openRoleId: string | null };

const KES = (n: number) => `KES ${n.toLocaleString()}`;

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm">{value}</dd>
    </div>
  );
}

function StepList({ view }: { view: ApprovalView }) {
  const pending = view.status === "Pending Approval";
  return (
    <ol className="space-y-2">
      {view.steps.map((step, i) => {
        const entry = [...view.log].reverse().find((e) => e.stepIndex === i);
        const isCurrent = pending && i === view.currentApproverIndex;
        return (
          <li key={i} className="flex gap-3 rounded-md border p-2.5">
            <span className="mt-0.5 shrink-0">
              {entry?.decision === "Approved" ? (
                <Check className="h-4 w-4 text-emerald-600" />
              ) : entry?.decision === "Rejected" ? (
                <X className="h-4 w-4 text-destructive" />
              ) : (
                <Clock className={`h-4 w-4 ${isCurrent ? "text-amber-600" : "text-muted-foreground/40"}`} />
              )}
            </span>
            <div className="min-w-0 text-sm">
              <p className="font-medium leading-tight">
                {step.label}
                {step.approverName ? ` — ${step.approverName}` : ""}
              </p>
              {entry ? (
                <p className="text-xs text-muted-foreground">
                  {entry.decision} {new Date(entry.decidedAt).toLocaleDateString("en-KE", { dateStyle: "medium" })}
                  {entry.comment ? ` — “${entry.comment}”` : ""}
                </p>
              ) : isCurrent ? (
                <p className="text-xs text-amber-700">Waiting for a decision</p>
              ) : null}
            </div>
          </li>
        );
      })}
      {view.log
        .filter((e) => e.decision === "Skipped")
        .map((e, i) => (
          <li key={`skip-${i}`} className="text-xs text-muted-foreground">
            {e.label} step skipped — the requester is that approver.
          </li>
        ))}
    </ol>
  );
}

function RequisitionApprovalInner() {
  const token = useSearchParams().get("token") ?? "";
  const [state, setState] = React.useState<LoadState>({ kind: "loading" });
  const [credential, setCredential] = React.useState<string | null>(null);
  const [signedInEmail, setSignedInEmail] = React.useState<string | null>(null);
  const [mismatchEmail, setMismatchEmail] = React.useState<string | null>(null);
  const [checking, setChecking] = React.useState(false);
  const [comment, setComment] = React.useState("");
  const [submitting, setSubmitting] = React.useState<"Approved" | "Rejected" | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [outcome, setOutcome] = React.useState<Outcome | null>(null);

  React.useEffect(() => {
    if (!token) {
      setState({ kind: "error", message: "This approval link is incomplete. Open it straight from your email." });
      return;
    }
    fetch(`/api/public/requisition-approval?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (res.status === 401) throw new Error("This approval link is invalid or has expired. Ask the recruitment team to resend it.");
        if (!res.ok) throw new Error("We couldn't load this request. Please try again shortly.");
        setState({ kind: "ready", ...body });
      })
      .catch((err) => setState({ kind: "error", message: err.message }));
  }, [token]);

  async function handleCredential(next: string) {
    setChecking(true);
    setError(null);
    setMismatchEmail(null);
    try {
      const res = await fetch("/api/public/requisition-approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, credential: next }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error("Couldn't verify that Google account. Please try again.");
      if (body.verified) {
        setCredential(next);
        setSignedInEmail(body.googleEmail);
      } else {
        setMismatchEmail(body.googleEmail);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setChecking(false);
    }
  }

  async function decide(decision: "Approved" | "Rejected") {
    if (!credential) return;
    if (decision === "Rejected" && !comment.trim()) {
      setError("Add a reason so the requester knows why.");
      return;
    }
    setSubmitting(decision);
    setError(null);
    try {
      const res = await fetch("/api/public/requisition-approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, credential, decision, comment: comment.trim() || undefined }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (body.error === "invalid_google_token") {
          // Google ID tokens last an hour — ask for a fresh sign-in.
          setCredential(null);
          setSignedInEmail(null);
          throw new Error("Your Google sign-in expired. Sign in again, then choose Approve or Reject.");
        }
        if (body.error === "stale_step" || body.error === "not_pending") {
          throw new Error("This step was already decided — reload the page to see where the request is now.");
        }
        throw new Error("Something went wrong. Please try again.");
      }
      setOutcome({ decision, status: body.status, openRoleId: body.openRoleId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(null);
    }
  }

  if (state.kind === "loading") {
    return (
      <FormShell brand={BRAND}>
        <FormStatusCard variant="loading" title="Loading request…" />
      </FormShell>
    );
  }
  if (state.kind === "error") {
    return (
      <FormShell brand={BRAND}>
        <FormStatusCard variant="error" title="Can't open this request">
          <p>{state.message}</p>
        </FormStatusCard>
      </FormShell>
    );
  }

  const { view, isCurrentStep, expectedEmail, stepIndex } = state;
  const step = view.steps[stepIndex];

  if (outcome) {
    const finalApproval = outcome.decision === "Approved" && outcome.status === "Converted to Open Role";
    return (
      <FormShell brand={BRAND}>
        <FormStatusCard
          variant={outcome.decision === "Approved" ? "success" : "info"}
          title={outcome.decision === "Approved" ? "Approved — thank you" : "Rejected"}
          subtitle={`${view.reqId} · ${view.roleTitle}`}
        >
          <p>
            {outcome.decision === "Rejected"
              ? "The requester and the recruitment team have been notified, along with your reason."
              : finalApproval
                ? `That was the final approval. The role is now open in the hiring pipeline${outcome.openRoleId ? ` as ${outcome.openRoleId}` : ""}.`
                : "The next approver has been emailed. The recruitment team's Google Chat is updated as it moves."}
          </p>
        </FormStatusCard>
      </FormShell>
    );
  }

  if (!isCurrentStep) {
    return (
      <FormShell brand={BRAND}>
        <FormStatusCard
          variant="info"
          title={view.status === "Pending Approval" ? "This step is already done" : `This request is ${view.status.toLowerCase()}`}
          subtitle={`${view.reqId} · ${view.roleTitle}`}
        >
          <p>Nothing more is needed from this link. Here&apos;s where the request stands:</p>
          <StepList view={view} />
        </FormStatusCard>
      </FormShell>
    );
  }

  return (
    <FormShell
      brand={BRAND}
      title={`${view.reqId} · ${view.roleTitle}`}
      subtitle={`${view.segment} requisition awaiting your approval as ${step?.label ?? "approver"}.`}
    >
      <div className="space-y-6">
        <div className="space-y-3 rounded-lg border border-border p-4">
          <p className="text-sm font-medium">The request</p>
          <dl className="grid grid-cols-2 gap-3">
            <Detail label="Type" value={view.type} />
            <Detail label="Department" value={view.department} />
            <Detail label="Branch" value={view.branch} />
            <Detail label="Headcount" value={view.headcount} />
            <Detail label="Currently in post (excl. planned exits)" value={view.currentHeadcount} />
            <Detail label="Labour model optimum (last 3 months)" value={view.labourModelHeadcount} />
            <Detail label="Employment type" value={view.employmentType} />
            <Detail label="Level" value={view.level} />
            <Detail label="Urgency" value={view.urgency} />
            <Detail label="Reason" value={view.reason} />
            <Detail label="Expected start" value={view.expectedStartDate} />
            <Detail
              label="Salary range"
              value={
                view.salaryRangeMin || view.salaryRangeMax
                  ? `${view.salaryRangeMin ? KES(view.salaryRangeMin) : "?"} – ${view.salaryRangeMax ? KES(view.salaryRangeMax) : "?"}`
                  : null
              }
            />
            <Detail
              label="Requested by"
              value={`${view.submittedBy}${view.submitterEmail ? ` (${view.submitterEmail})` : ""}`}
            />
          </dl>
          <Detail label="Justification" value={<span className="whitespace-pre-wrap">{view.context || view.justification}</span>} />
        </div>

        <div className="space-y-2 rounded-lg border border-border p-4">
          <p className="text-sm font-medium">Approval steps</p>
          <StepList view={view} />
        </div>

        <div className="space-y-3 rounded-lg border border-border p-4">
          {!credential ? (
            <>
              <p className="text-sm font-medium">Sign in to decide</p>
              <p className="text-xs text-muted-foreground">
                Sign in with <span className="font-medium text-foreground">{expectedEmail}</span>, the Google account set
                up for this step.
              </p>
              <GoogleSignInButton onCredential={handleCredential} disabled={checking} />
              {checking && <p className="text-xs text-muted-foreground">Verifying…</p>}
              {mismatchEmail && (
                <p className="text-sm text-destructive">
                  You signed in as {mismatchEmail}, but this step needs {expectedEmail}. Try a different Google account,
                  or ask the recruitment team to update the approver in Settings.
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">Signed in as {signedInEmail}</p>
              <div className="space-y-1.5">
                <Label htmlFor="comment">Comment (required to reject)</Label>
                <Textarea id="comment" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} maxLength={1000} />
              </div>
              <div className="flex gap-3">
                <Button
                  onClick={() => decide("Approved")}
                  disabled={!!submitting}
                  className="flex-1 bg-penda-blue hover:bg-penda-blue-dark"
                >
                  {submitting === "Approved" ? "Approving…" : "Approve"}
                </Button>
                <Button variant="outline" onClick={() => decide("Rejected")} disabled={!!submitting} className="flex-1">
                  {submitting === "Rejected" ? "Rejecting…" : "Reject"}
                </Button>
              </div>
            </>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
      </div>
    </FormShell>
  );
}

export default function RequisitionApprovalPage() {
  return (
    <React.Suspense fallback={null}>
      <RequisitionApprovalInner />
    </React.Suspense>
  );
}
