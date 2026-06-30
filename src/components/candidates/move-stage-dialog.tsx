"use client";

import * as React from "react";
import { Candidate, CandidateStage } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STAGES: CandidateStage[] = [
  "First Interview",
  "Second Interview",
  "Panel Interview",
  "Work Trial",
  "Reference Check",
  "Offer",
  "Hired",
  "Backup Pool",
  "Rejected",
  "Withdrawn",
];

export function MoveStageDialog({
  candidate,
  onOpenChange,
  onMove,
}: {
  candidate: Candidate | null;
  onOpenChange: (open: boolean) => void;
  onMove: (id: string, stage: CandidateStage) => void;
}) {
  const [stage, setStage] = React.useState<CandidateStage>(candidate?.stage ?? "First Interview");

  React.useEffect(() => {
    if (candidate) setStage(candidate.stage);
  }, [candidate]);

  function handleSave() {
    if (!candidate) return;
    onMove(candidate.id, stage);
    onOpenChange(false);
  }

  return (
    <Dialog open={!!candidate} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        {candidate && (
          <>
            <DialogHeader>
              <DialogTitle>Move {candidate.name}</DialogTitle>
            </DialogHeader>
            <Select value={stage} onValueChange={(v) => setStage(v as CandidateStage)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAGES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <DialogFooter>
              <Button onClick={handleSave} className="bg-penda-teal hover:bg-penda-teal-dark">
                Save
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
