"use client";

import * as React from "react";
import { Check, Copy, FolderOpen } from "lucide-react";
import { ReferenceCheck } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefereeStatusRow } from "./referee-status-row";
import { getCandidateForRefCheck, OUTCOME_STYLES } from "@/lib/reference-check-helpers";
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
  const { candidates } = useRecruitmentData();
  const candidate = getCandidateForRefCheck(refCheck, candidates);
  const [copied, setCopied] = React.useState<1 | 2 | null>(null);

  async function handleCopy(num: 1 | 2) {
    try {
      await copyRefereeLink(refCheck.id, refCheck.candidateId, num);
      setCopied(num);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // silently fail — clipboard access may be blocked
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div>
          <CardTitle className="text-base">{candidate?.name ?? "Unknown candidate"}</CardTitle>
          <p className="text-xs text-muted-foreground">{refCheck.refId}</p>
        </div>
        <Badge className={OUTCOME_STYLES[refCheck.outcome]}>{refCheck.outcome}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
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
              {copied === 1 ? <Check className="h-3.5 w-3.5 text-penda-teal" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
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
              {copied === 2 ? <Check className="h-3.5 w-3.5 text-penda-teal" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>

        {refCheck.driveFolderUrl && (
          <a
            href={refCheck.driveFolderUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-penda-teal hover:underline"
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
      </CardContent>
    </Card>
  );
}
