"use client";

import * as React from "react";
import { WorkTrial } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getDisplayStatus,
  getCandidateForTrial,
  getBranchForTrial,
} from "@/lib/work-trial-helpers";
import { ScoreEntryDialog } from "./score-entry-dialog";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";

const STATUS_STYLES: Record<string, string> = {
  "Awaiting Arrival": "bg-muted text-muted-foreground border-transparent",
  "Awaiting Score": "bg-high-bg text-high-fg border-transparent",
  Complete: "bg-penda-teal-light text-penda-teal-dark border-transparent",
};

export function WorkTrialCard({
  trial,
  onSubmitScores,
}: {
  trial: WorkTrial;
  onSubmitScores: (id: string, scores: { technical: number; patient: number; safety: number; culture: number }) => void;
}) {
  const { candidates, branches } = useRecruitmentData();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const candidate = getCandidateForTrial(trial, candidates);
  const branch = getBranchForTrial(trial, branches);
  const status = getDisplayStatus(trial);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div>
          <CardTitle className="text-base">{candidate?.name ?? "Unknown candidate"}</CardTitle>
          <p className="text-xs text-muted-foreground">{branch?.name ?? "—"} · {trial.date}</p>
        </div>
        <Badge className={STATUS_STYLES[status]}>{status}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">Supervisor: {trial.supervisor}</p>

        {status === "Complete" && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Score label="Technical" value={trial.scoreTechnical} />
            <Score label="Patient" value={trial.scorePatient} />
            <Score label="Safety" value={trial.scoreSafety} />
            <Score label="Culture" value={trial.scoreCulture} />
            <div className="col-span-2 flex items-center justify-between rounded-md border border-border p-2 mt-1">
              <span className="font-medium">Total</span>
              <Badge variant={trial.passFail === "Pass" ? "ips" : "critical"}>
                {trial.total} — {trial.passFail}
              </Badge>
            </div>
          </div>
        )}

        {(trial.reminder12hSent || trial.escalation24hSent) && (
          <div className="flex gap-2 flex-wrap">
            {trial.reminder12hSent && <Badge variant="outline">12h reminder sent</Badge>}
            {trial.escalation24hSent && <Badge variant="outline">24h escalation sent</Badge>}
          </div>
        )}

        {status !== "Complete" && (
          <Button size="sm" variant="outline" onClick={() => setDialogOpen(true)}>
            Submit Scores
          </Button>
        )}
      </CardContent>

      <ScoreEntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={(scores) => onSubmitScores(trial.id, scores)}
      />
    </Card>
  );
}

function Score({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="flex items-center justify-between rounded-md bg-muted px-2 py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value ?? "—"}</span>
    </div>
  );
}
