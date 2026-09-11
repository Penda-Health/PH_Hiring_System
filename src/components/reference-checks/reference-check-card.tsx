"use client";

import * as React from "react";
import { Check, Copy, Download, FolderOpen, RefreshCw, ShieldAlert, Sparkles, Trash2 } from "lucide-react";
import { ReferenceCheck } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefereeStatusRow } from "./referee-status-row";
import { VerifyReferenceCheckDialog } from "./verify-reference-check-dialog";
import { EditReferenceCheckDialog } from "./edit-reference-check-dialog";
import { AI_STATUS_STYLES, getCandidateForRefCheck, OUTCOME_STYLES, STATUS_STYLES } from "@/lib/reference-check-helpers";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";

const OUTCOMES: ReferenceCheck["outcome"][] = ["Pending", "Positive", "Negative", "Mixed"];

async function copyRefereeLink(refCheckId: string, candidateId: string, refereeNum: 1 | 2) {
  const res = await fetch("/api/forms/get-link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "referee", refCheckId, candidateId, refereeNum }),
  });
  if (!res.ok) throw new Error("Failed to get link");
  const { url } = await res.json();
  await navigator.clipboard.writeText(url as string);
}

export function ReferenceCheckCard({
  refCheck,
  onUpdateOutcome,
}: {
  refCheck: ReferenceCheck;
  onUpdateOutcome: (id: string, outcome: ReferenceCheck["outcome"]) => void;
}) {
  const {
    candidates,
    canEdit,
    canDelete,
    verifyAndInitiateReferenceCheck,
    updateReferenceCheck,
    overrideRefereeGoogleVerification,
    generateReferenceCheckAiInsights,
    deleteReferenceCheck,
  } = useRecruitmentData();
  const candidate = getCandidateForRefCheck(refCheck, candidates);
  const [copied, setCopied] = React.useState<1 | 2 | null>(null);
  const [downloadingReport, setDownloadingReport] = React.useState(false);
  const [reportError, setReportError] = React.useState<string | null>(null);
  const [overriding, setOverriding] = React.useState<1 | 2 | null>(null);
  const [generatingInsights, setGeneratingInsights] = React.useState(false);
  const [insightsError, setInsightsError] = React.useState<string | null>(null);

  async function handleCopy(num: 1 | 2) {
    try {
      await copyRefereeLink(refCheck.id, refCheck.candidateId, num);
      setCopied(num);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // silently fail — clipboard access may be blocked
    }
  }

  async function handleOverride(num: 1 | 2) {
    setOverriding(num);
    try {
      await overrideRefereeGoogleVerification(refCheck.id, num);
    } finally {
      setOverriding(null);
    }
  }

  // A report needs at least one referee's answers to say anything — see the
  // route's matching 409 check.
  const reportReady = refCheck.referee1.responded || refCheck.referee2.responded;

  async function downloadReport() {
    setReportError(null);
    setDownloadingReport(true);
    try {
      const res = await fetch(`/api/reference-checks/${refCheck.id}/report`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(
          err.error === "not_complete" ? "No referee has responded yet." : "Failed to generate report."
        );
      }
      const blob = await res.blob();
      const disposition = res.headers.get("content-disposition") ?? "";
      const filename =
        disposition.match(/filename="(.+)"/)?.[1] ?? `Reference Check Report - ${candidate?.name ?? refCheck.refId}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setReportError(err instanceof Error ? err.message : "Failed to download report");
      setTimeout(() => setReportError(null), 4000);
    } finally {
      setDownloadingReport(false);
    }
  }

  function handleDelete() {
    const name = candidate?.name ?? "this candidate";
    if (!window.confirm(`Delete ${name}'s reference check? You'll have 30 seconds to undo before it's permanent.`)) {
      return;
    }
    deleteReferenceCheck(refCheck.id);
  }

  function needsOverride(num: 1 | 2) {
    const referee = num === 1 ? refCheck.referee1 : refCheck.referee2;
    return referee.responded && !referee.googleVerified && !referee.googleVerifiedOverrideBy;
  }

  async function handleGenerateInsights() {
    setInsightsError(null);
    setGeneratingInsights(true);
    try {
      await generateReferenceCheckAiInsights(refCheck.id);
    } catch (err) {
      setInsightsError(err instanceof Error ? err.message : "Failed to generate AI insights");
      setTimeout(() => setInsightsError(null), 4000);
    } finally {
      setGeneratingInsights(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div>
          <CardTitle className="text-base">{candidate?.name ?? "Unknown candidate"}</CardTitle>
          <p className="text-xs text-muted-foreground">{refCheck.refId}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-0.5">
            {canEdit && <EditReferenceCheckDialog refCheck={refCheck} onSave={updateReferenceCheck} />}
            {canDelete && (
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0 text-destructive/60 hover:text-destructive"
                title="Delete reference check"
                onClick={handleDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <Badge className={STATUS_STYLES[refCheck.status]}>{refCheck.status}</Badge>
          <Badge className={OUTCOME_STYLES[refCheck.outcome]}>{refCheck.outcome}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {refCheck.status === "Awaiting Verification" ? (
          <VerifyReferenceCheckDialog
            refCheck={refCheck}
            candidateName={candidate?.name ?? "this candidate"}
            onVerify={verifyAndInitiateReferenceCheck}
          />
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <RefereeStatusRow referee={refCheck.referee1} />
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0"
                title="Copy referee 1 link"
                onClick={() => handleCopy(1)}
              >
                {copied === 1 ? <Check className="h-3.5 w-3.5 text-penda-blue" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
            {needsOverride(1) && canEdit && (
              <button
                type="button"
                onClick={() => handleOverride(1)}
                disabled={overriding === 1}
                className="flex items-center gap-1.5 text-xs text-amber-700 hover:underline"
              >
                <ShieldAlert className="h-3 w-3" />
                {overriding === 1 ? "Marking…" : "Referee 1 wasn't Google-verified — mark verified anyway"}
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <RefereeStatusRow referee={refCheck.referee2} />
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 shrink-0"
                title="Copy referee 2 link"
                onClick={() => handleCopy(2)}
              >
                {copied === 2 ? <Check className="h-3.5 w-3.5 text-penda-blue" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>
            {needsOverride(2) && canEdit && (
              <button
                type="button"
                onClick={() => handleOverride(2)}
                disabled={overriding === 2}
                className="flex items-center gap-1.5 text-xs text-amber-700 hover:underline"
              >
                <ShieldAlert className="h-3 w-3" />
                {overriding === 2 ? "Marking…" : "Referee 2 wasn't Google-verified — mark verified anyway"}
              </button>
            )}
          </div>
        )}

        {refCheck.driveFolderUrl && (
          <a
            href={refCheck.driveFolderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-penda-blue hover:underline"
          >
            <FolderOpen className="h-3.5 w-3.5" /> View Drive folder
          </a>
        )}

        {reportReady && (
          <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-medium">
                <Sparkles className="h-3.5 w-3.5 text-penda-blue" />
                AI Insights
              </div>
              {canEdit && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 shrink-0"
                  title={refCheck.aiInsights ? "Refresh AI insights" : "Generate AI insights"}
                  onClick={handleGenerateInsights}
                  disabled={generatingInsights}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${generatingInsights ? "animate-spin" : ""}`} />
                </Button>
              )}
            </div>

            {refCheck.aiInsights ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={AI_STATUS_STYLES[refCheck.aiInsights.overallStatus]}>
                    {refCheck.aiInsights.overallStatus}
                  </Badge>
                  <span className="text-[11px] text-muted-foreground">
                    Recommendation {refCheck.aiInsights.recommendationScore}/5 · Overall {refCheck.aiInsights.overallScore}/5 ·{" "}
                    {refCheck.aiInsights.confidenceScore}% confidence
                  </span>
                </div>
                <p className="text-xs text-foreground">{refCheck.aiInsights.summary}</p>

                {refCheck.aiInsights.keyStrengths.length > 0 && (
                  <div>
                    <p className="text-[11px] font-medium text-success-fg">Strengths</p>
                    <ul className="list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
                      {refCheck.aiInsights.keyStrengths.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {refCheck.aiInsights.areasOfConcern.length > 0 && (
                  <div>
                    <p className="text-[11px] font-medium text-high-fg">Areas of concern</p>
                    <ul className="list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
                      {refCheck.aiInsights.areasOfConcern.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {refCheck.aiInsights.consistencyNotes && (
                  <p className="text-[11px] text-muted-foreground">
                    <span className="font-medium text-foreground">Consistency: </span>
                    {refCheck.aiInsights.consistencyNotes}
                  </p>
                )}

                {refCheck.aiInsights.suggestedFollowUps.length > 0 && (
                  <div>
                    <p className="text-[11px] font-medium text-foreground">Suggested follow-ups</p>
                    <ul className="list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
                      {refCheck.aiInsights.suggestedFollowUps.map((s, i) => (
                        <li key={i}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="text-[10px] text-muted-foreground">
                  Generated {new Date(refCheck.aiInsights.generatedAt).toLocaleString()}
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {canEdit
                  ? "No AI insights yet — click refresh to generate an analysis of the referee responses."
                  : "No AI insights generated yet."}
              </p>
            )}
            {insightsError && <p className="text-xs text-destructive">{insightsError}</p>}
          </div>
        )}

        <Select
          value={refCheck.outcome}
          onValueChange={(v) => onUpdateOutcome(refCheck.id, v as ReferenceCheck["outcome"])}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {OUTCOMES.map((outcome) => (
              <SelectItem key={outcome} value={outcome}>
                {outcome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {reportReady && (
          <Button size="sm" variant="outline" onClick={downloadReport} disabled={downloadingReport} className="w-full gap-1">
            <Download className="h-3.5 w-3.5" />
            {downloadingReport ? "Preparing…" : "Download report"}
          </Button>
        )}
        {reportError && <p className="text-xs text-destructive">{reportError}</p>}
      </CardContent>
    </Card>
  );
}
