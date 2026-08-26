"use client";

import * as React from "react";
import { Check, Copy, Download, FolderOpen, ShieldAlert } from "lucide-react";
import { ReferenceCheck } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefereeStatusRow } from "./referee-status-row";
import { VerifyReferenceCheckDialog } from "./verify-reference-check-dialog";
import { getCandidateForRefCheck, OUTCOME_STYLES, STATUS_STYLES } from "@/lib/reference-check-helpers";
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
  const { candidates, canEdit, verifyAndInitiateReferenceCheck, overrideRefereeGoogleVerification } =
    useRecruitmentData();
  const candidate = getCandidateForRefCheck(refCheck, candidates);
  const [copied, setCopied] = React.useState<1 | 2 | null>(null);
  const [downloadingReport, setDownloadingReport] = React.useState(false);
  const [reportError, setReportError] = React.useState<string | null>(null);
  const [overriding, setOverriding] = React.useState<1 | 2 | null>(null);

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

  function needsOverride(num: 1 | 2) {
    const referee = num === 1 ? refCheck.referee1 : refCheck.referee2;
    return referee.responded && !referee.googleVerified && !referee.googleVerifiedOverrideBy;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div>
          <CardTitle className="text-base">{candidate?.name ?? "Unknown candidate"}</CardTitle>
          <p className="text-xs text-muted-foreground">{refCheck.refId}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
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
