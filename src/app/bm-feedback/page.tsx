"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FormShell, FormMessage } from "@/components/forms/form-shell";
import { FormattableTextarea } from "@/components/forms/formattable-textarea";
import { CULTURE_AUTO_FAIL_BELOW, TECHNICAL_AUTO_FAIL_BELOW, WRITTEN_ASSESSMENT_MIN_LENGTH } from "@/lib/work-trial-helpers";

type FormData = {
  candidateName: string;
  roleTitle: string;
  branchName: string;
  supervisor: string;
  trialDate: string;
  arrivalMarked: boolean | null;
  alreadyScored: boolean;
  submittedByRole: "BM" | "Incharge" | null;
  bmApprovedAt: string | null;
  pendingApproval: boolean;
  scoreTechnical: number | null;
  scorePatient: number | null;
  scoreCulture: number | null;
  total: number | null;
  passFail: "Pass" | "Fail" | "Pending";
};

const CATEGORIES = [
  {
    key: "culture" as const,
    label: "Culture Fit",
    weight: 40,
    description: "Team behaviour, alignment with Penda values, attitude, and professional conduct. Score of 6/10 or below is an automatic fail.",
  },
  {
    key: "patient" as const,
    label: "Patient Experience",
    weight: 40,
    description: "Communication with patients, empathy, bedside manner, and patient-centred care.",
  },
  {
    key: "technical" as const,
    label: "Technical Fit",
    weight: 20,
    description: "Clinical competency, procedure accuracy, equipment handling, and adherence to clinical protocols. Score of 6/10 or below is an automatic fail.",
  },
] as const;

type ScoreKey = (typeof CATEGORIES)[number]["key"];

function RatingInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex gap-1 flex-wrap">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n * 10)}
          className={`w-9 h-9 rounded-md text-sm font-medium border transition-colors ${
            value === n * 10
              ? "bg-penda-teal text-white border-penda-teal"
              : "border-border hover:border-penda-teal/60 text-foreground"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function BmFeedbackForm() {
  const token = useSearchParams().get("token");
  const [data, setData] = React.useState<FormData | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  // Step tracking
  const [step, setStep] = React.useState<"arrival" | "role-select" | "scoring" | "feedback" | "done" | "pending-approval" | "approving" | "approved">("arrival");
  const [arrivalSubmitting, setArrivalSubmitting] = React.useState(false);
  const [selectedRole, setSelectedRole] = React.useState<"BM" | "Incharge" | null>(null);
  const [scores, setScores] = React.useState<Record<ScoreKey, number>>({
    technical: 0,
    patient: 0,
    culture: 0,
  });
  const [scoreSubmitting, setScoreSubmitting] = React.useState(false);
  const [scoreResult, setScoreResult] = React.useState<{ total: number; passFail: "Pass" | "Fail"; submittedByRole: "BM" | "Incharge" } | null>(null);
  const [comments, setComments] = React.useState({
    commentCulture: "",
    commentPatient: "",
    commentTechnical: "",
    strengths: "",
    areasOfDevelopment: "",
    overallRecommendation: "",
  });
  const [approvalSubmitting, setApprovalSubmitting] = React.useState(false);
  const [approvalResult, setApprovalResult] = React.useState<{ total: number; passFail: "Pass" | "Fail" } | null>(null);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!token) { setLoadError("missing_token"); return; }
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
        if (d.pendingApproval) {
          setStep("pending-approval");
        } else if (d.alreadyScored) {
          setStep("done");
        } else if (d.arrivalMarked === true) {
          setStep("role-select");
        } else if (d.arrivalMarked === false) {
          setStep("done");
        }
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

  const header = [data.candidateName, data.roleTitle, data.branchName, data.trialDate]
    .filter(Boolean)
    .join(" · ");

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
      if (arrived) {
        setStep("role-select");
      } else {
        setStep("done");
        setData((d) => d ? { ...d, arrivalMarked: false } : d);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setArrivalSubmitting(false);
    }
  }

  async function handleScoreSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedRole) return;
    setSubmitError(null);
    setScoreSubmitting(true);
    try {
      const res = await fetch("/api/public/bm-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          step: "scoring",
          submittedByRole: selectedRole,
          scores,
          comments: {
            commentCulture: comments.commentCulture || undefined,
            commentPatient: comments.commentPatient || undefined,
            commentTechnical: comments.commentTechnical || undefined,
            strengths: comments.strengths || undefined,
            areasOfDevelopment: comments.areasOfDevelopment || undefined,
            overallRecommendation: comments.overallRecommendation || undefined,
          },
        }),
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
      setScoreResult({ total: body.total, passFail: body.passFail, submittedByRole: body.submittedByRole });
      setStep("done");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setScoreSubmitting(false);
    }
  }

  async function handleApproval() {
    setSubmitError(null);
    setApprovalSubmitting(true);
    try {
      const res = await fetch("/api/public/bm-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, step: "approval" }),
      });
      if (!res.ok) throw new Error("Something went wrong. Please try again.");
      const body = await res.json();
      setApprovalResult({ total: body.total, passFail: body.passFail });
      setStep("approved");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setApprovalSubmitting(false);
    }
  }

  const weightedTotal = CATEGORIES.reduce(
    (sum, c) => sum + (scores[c.key] / 100) * c.weight,
    0
  );
  const cultureAutoFail = scores.culture > 0 && scores.culture < CULTURE_AUTO_FAIL_BELOW;
  const technicalAutoFail = scores.technical > 0 && scores.technical < TECHNICAL_AUTO_FAIL_BELOW;
  const willPass = !cultureAutoFail && !technicalAutoFail && weightedTotal >= 65;

  // ─── Arrival step ───────────────────────────────────────────────────────────
  if (step === "arrival" && data.arrivalMarked === null) {
    return (
      <FormShell title="Work Trial Assessment" subtitle={header}>
        <div className="space-y-5">
          <div className="rounded-lg border border-border bg-muted/40 p-4 space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Candidate</p>
            <p className="font-semibold text-foreground">{data.candidateName}</p>
            {data.roleTitle && <p className="text-sm text-muted-foreground">{data.roleTitle}</p>}
            <p className="text-sm text-muted-foreground">{data.branchName} · {data.trialDate}</p>
            {data.supervisor && <p className="text-sm text-muted-foreground">Supervisor: {data.supervisor}</p>}
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Step 1 of 4 — Did the candidate arrive?</p>
            {submitError && <p className="text-sm text-destructive">{submitError}</p>}
            <div className="flex gap-3">
              <Button
                className="flex-1 bg-penda-teal hover:bg-penda-teal-dark"
                onClick={() => handleArrival(true)}
                disabled={arrivalSubmitting}
              >
                Yes, arrived
              </Button>
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => handleArrival(false)}
                disabled={arrivalSubmitting}
              >
                No, did not arrive
              </Button>
            </div>
          </div>
        </div>
      </FormShell>
    );
  }

  // ─── Role select step ────────────────────────────────────────────────────────
  if (step === "role-select") {
    return (
      <FormShell title="Work Trial Assessment" subtitle={header}>
        <div className="space-y-5">
          <p className="text-sm font-medium">Step 2 of 4 — I am the:</p>
          <div className="grid grid-cols-2 gap-3">
            {(["BM", "Incharge"] as const).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => { setSelectedRole(role); setStep("scoring"); }}
                className="rounded-lg border p-4 text-left transition-colors hover:border-penda-teal/60 hover:bg-penda-teal/5 border-border"
              >
                <p className="font-semibold">{role === "BM" ? "Branch Manager" : "In-Charge"}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {role === "BM"
                    ? "Submit scores directly — assessment complete."
                    : "Submit scores for BM review and approval."}
                </p>
              </button>
            ))}
          </div>
        </div>
      </FormShell>
    );
  }

  // ─── Scoring step ────────────────────────────────────────────────────────────
  if (step === "scoring") {
    const commentKey = { culture: "commentCulture", patient: "commentPatient", technical: "commentTechnical" } as const;
    return (
      <FormShell title="Work Trial Assessment" subtitle={header}>
        <div className="space-y-6">
          <p className="text-sm font-medium text-muted-foreground">
            Step 3 of 4 — Score each area (1 = Poor · 5 = Good · 10 = Excellent)
          </p>

          {CATEGORIES.map((cat) => (
            <div key={cat.key} className="space-y-3 rounded-lg border border-border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-semibold text-sm">{cat.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{cat.description}</p>
                </div>
                <Badge variant="outline" className="shrink-0 text-xs mt-0.5">
                  {cat.weight}%
                </Badge>
              </div>
              <RatingInput
                value={scores[cat.key]}
                onChange={(v) => setScores((s) => ({ ...s, [cat.key]: v }))}
              />
              {scores[cat.key] > 0 && (
                <p className="text-xs text-penda-teal font-medium">
                  Rating: {scores[cat.key] / 10} / 10
                  {((cat.key === "culture" && cultureAutoFail) || (cat.key === "technical" && technicalAutoFail)) && (
                    <span className="ml-2 text-destructive">— automatic fail</span>
                  )}
                </p>
              )}
              <FormattableTextarea
                placeholder={`Specific observations on ${cat.label.toLowerCase()}…`}
                value={comments[commentKey[cat.key]]}
                onChange={(v) => setComments((c) => ({ ...c, [commentKey[cat.key]]: v }))}
                rows={3}
                required
                minLength={WRITTEN_ASSESSMENT_MIN_LENGTH}
              />
            </div>
          ))}

          {/* ─── Weighted score summary ─── */}
          <div className="rounded-lg border border-border bg-muted/40 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Weighted score</p>
              <p className="text-2xl font-bold">{weightedTotal.toFixed(1)} / 100</p>
            </div>
            <Badge
              variant={weightedTotal === 0 ? "outline" : willPass ? "ips" : "so"}
              className="text-sm px-3 py-1"
            >
              {weightedTotal === 0 ? "—" : willPass ? "PASS" : "FAIL"}
            </Badge>
          </div>

          {cultureAutoFail && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              Culture Fit score is 6/10 or below — this is an automatic fail regardless of other scores.
            </div>
          )}
          {technicalAutoFail && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">
              Technical Fit score is 6/10 or below — this is an automatic fail regardless of other scores.
            </div>
          )}

          <Button
            type="button"
            className="w-full bg-penda-teal hover:bg-penda-teal-dark"
            onClick={() => setStep("feedback")}
            disabled={
              Object.values(scores).some((v) => v === 0) ||
              CATEGORIES.some((cat) => comments[commentKey[cat.key]].trim().length < WRITTEN_ASSESSMENT_MIN_LENGTH)
            }
          >
            Continue to qualitative feedback
          </Button>
        </div>
      </FormShell>
    );
  }

  // ─── Qualitative feedback step ────────────────────────────────────────────────
  if (step === "feedback") {
    return (
      <FormShell title="Work Trial Assessment" subtitle={header}>
        <form onSubmit={handleScoreSubmit} className="space-y-6">
          <p className="text-sm font-medium text-muted-foreground">
            Step 4 of 4 — Qualitative feedback
          </p>

          <div className="rounded-lg border border-border bg-muted/40 p-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Weighted score</span>
            <span className="font-semibold flex items-center gap-2">
              {weightedTotal.toFixed(1)} / 100
              <Badge variant={willPass ? "ips" : "so"} className="text-xs">
                {willPass ? "PASS" : "FAIL"}
              </Badge>
            </span>
          </div>

          {/* ─── Qualitative feedback sections ─── */}
          <div className="space-y-4 rounded-lg border border-border p-4">
            <div>
              <p className="text-sm font-semibold">Qualitative Feedback</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Required — at least {WRITTEN_ASSESSMENT_MIN_LENGTH} characters each. Use the toolbar for **bold**, *italic*, and bullet lists.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Strengths</label>
              <p className="text-xs text-muted-foreground">List specific strengths observed in the candidate.</p>
              <FormattableTextarea
                placeholder="e.g. Excellent communication with patients, quick to learn procedures…"
                value={comments.strengths}
                onChange={(v) => setComments((c) => ({ ...c, strengths: v }))}
                rows={3}
                required
                minLength={WRITTEN_ASSESSMENT_MIN_LENGTH}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Areas of Development</label>
              <p className="text-xs text-muted-foreground">List specific areas where the candidate could improve.</p>
              <FormattableTextarea
                placeholder="e.g. Needs to improve documentation speed, could be more proactive…"
                value={comments.areasOfDevelopment}
                onChange={(v) => setComments((c) => ({ ...c, areasOfDevelopment: v }))}
                rows={3}
                required
                minLength={WRITTEN_ASSESSMENT_MIN_LENGTH}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">Overall Recommendation</label>
              <p className="text-xs text-muted-foreground">Provide your general recommendation on the candidate&apos;s performance and suitability.</p>
              <FormattableTextarea
                placeholder="e.g. Strong candidate — recommend for hire. Would fit well in a busy branch…"
                value={comments.overallRecommendation}
                onChange={(v) => setComments((c) => ({ ...c, overallRecommendation: v }))}
                rows={4}
                required
                minLength={WRITTEN_ASSESSMENT_MIN_LENGTH}
              />
            </div>
          </div>

          {selectedRole === "Incharge" && (
            <div className="rounded-lg border border-amber-300/60 bg-amber-50 dark:bg-amber-900/20 p-3 text-sm text-amber-700 dark:text-amber-300">
              These scores will be sent to the Branch Manager for approval before being finalised.
            </div>
          )}

          {submitError && <p className="text-sm text-destructive">{submitError}</p>}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep("scoring")}
              disabled={scoreSubmitting}
            >
              Back
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-penda-teal hover:bg-penda-teal-dark"
              disabled={
                comments.strengths.trim().length < WRITTEN_ASSESSMENT_MIN_LENGTH ||
                comments.areasOfDevelopment.trim().length < WRITTEN_ASSESSMENT_MIN_LENGTH ||
                comments.overallRecommendation.trim().length < WRITTEN_ASSESSMENT_MIN_LENGTH ||
                scoreSubmitting
              }
            >
              {scoreSubmitting
                ? "Submitting…"
                : selectedRole === "Incharge"
                ? "Submit for BM approval"
                : "Submit assessment"}
            </Button>
          </div>
        </form>
      </FormShell>
    );
  }

  // ─── Pending BM approval (BM opens same link to approve) ─────────────────────
  if (step === "pending-approval" && !approvalResult) {
    return (
      <FormShell title="Scores pending your approval" subtitle={header}>
        <div className="space-y-5">
          <p className="text-sm text-muted-foreground">
            The In-Charge has submitted assessment scores for {data.candidateName}. Please review and approve.
          </p>

          <div className="rounded-lg border border-border divide-y divide-border">
            {[
              { label: "Culture Fit (40%)", value: data.scoreCulture },
              { label: "Patient Experience (40%)", value: data.scorePatient },
              { label: "Technical Fit (20%)", value: data.scoreTechnical },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm text-muted-foreground">{label}</span>
                <span className="font-semibold text-sm">{value !== null ? `${value / 10} / 10` : "—"}</span>
              </div>
            ))}
            <div className="flex items-center justify-between px-4 py-3 bg-muted/40">
              <span className="font-medium text-sm">Weighted Total</span>
              <span className="font-bold text-sm">{data.total?.toFixed(1)} / 100</span>
            </div>
          </div>

          {submitError && <p className="text-sm text-destructive">{submitError}</p>}

          <div className="flex gap-3">
            <Button
              className="flex-1 bg-penda-teal hover:bg-penda-teal-dark"
              onClick={handleApproval}
              disabled={approvalSubmitting}
            >
              {approvalSubmitting ? "Approving…" : "Approve scores"}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            If scores need correction, contact <a className="text-penda-teal underline" href="mailto:ta@penda.co.ke">ta@penda.co.ke</a>.
          </p>
        </div>
      </FormShell>
    );
  }

  // ─── Approved ────────────────────────────────────────────────────────────────
  if (step === "approved" && approvalResult) {
    return (
      <FormShell title="Assessment approved" subtitle={header}>
        <FormMessage>
          <p>
            Score: <strong>{approvalResult.total.toFixed(1)}/100</strong> —{" "}
            <Badge variant={approvalResult.passFail === "Pass" ? "ips" : "so"}>
              {approvalResult.passFail}
            </Badge>
          </p>
          <p>The recruitment team has been notified. Thank you.</p>
        </FormMessage>
      </FormShell>
    );
  }

  // ─── Done / Already scored ────────────────────────────────────────────────────
  if (step === "done" && !scoreResult) {
    if (data.arrivalMarked === false) {
      return (
        <FormShell title="Recorded" subtitle={header}>
          <FormMessage>
            <p>Thanks — we&apos;ve recorded that {data.candidateName} did not arrive. The recruitment team has been notified.</p>
          </FormMessage>
        </FormShell>
      );
    }
    if (data.alreadyScored) {
      return (
        <FormShell title="Already submitted" subtitle={header}>
          <FormMessage>
            <p>This assessment has already been submitted. Contact <a className="text-penda-teal underline" href="mailto:ta@penda.co.ke">ta@penda.co.ke</a> if you need to make a correction.</p>
          </FormMessage>
        </FormShell>
      );
    }
  }

  // ─── Score submitted confirmation ─────────────────────────────────────────────
  if (scoreResult) {
    if (scoreResult.submittedByRole === "Incharge") {
      return (
        <FormShell title="Scores submitted" subtitle={header}>
          <FormMessage>
            <p>
              Score: <strong>{scoreResult.total.toFixed(1)}/100</strong>
            </p>
            <p>
              Your scores have been recorded and sent to the Branch Manager for approval.
              The assessment will be finalised once the BM approves.
            </p>
          </FormMessage>
        </FormShell>
      );
    }
    return (
      <FormShell title="Assessment submitted" subtitle={header}>
        <FormMessage>
          <p>
            Score: <strong>{scoreResult.total.toFixed(1)}/100</strong> —{" "}
            <Badge variant={scoreResult.passFail === "Pass" ? "ips" : "so"}>
              {scoreResult.passFail}
            </Badge>
          </p>
          <p>The recruitment team has been notified. Thank you.</p>
        </FormMessage>
      </FormShell>
    );
  }

  return null;
}

export default function BmFeedbackPage() {
  return (
    <React.Suspense fallback={null}>
      <BmFeedbackForm />
    </React.Suspense>
  );
}
