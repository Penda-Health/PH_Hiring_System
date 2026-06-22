"use client";

import { FolderOpen } from "lucide-react";
import { ReferenceCheck } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefereeStatusRow } from "./referee-status-row";
import { getCandidateForRefCheck, OUTCOME_STYLES } from "@/lib/reference-check-helpers";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";

const OUTCOMES: ReferenceCheck["outcome"][] = ["Pending", "Positive", "Negative", "Mixed"];

export function ReferenceCheckCard({
  refCheck,
  onUpdateOutcome,
}: {
  refCheck: ReferenceCheck;
  onUpdateOutcome: (id: string, outcome: ReferenceCheck["outcome"]) => void;
}) {
  const { candidates } = useRecruitmentData();
  const candidate = getCandidateForRefCheck(refCheck, candidates);

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
        <RefereeStatusRow referee={refCheck.referee1} />
        <RefereeStatusRow referee={refCheck.referee2} />

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
