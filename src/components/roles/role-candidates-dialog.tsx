"use client";

import { Candidate, CandidateStage, OpenRole } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { daysInStage } from "@/lib/pipeline-helpers";
import { candidatesForRole } from "@/lib/roles-helpers";

const ALL_STAGES: CandidateStage[] = [
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

export function RoleCandidatesDialog({
  role,
  candidates,
  onOpenChange,
  onSelectCandidate,
}: {
  role: OpenRole | null;
  candidates: Candidate[];
  onOpenChange: (open: boolean) => void;
  onSelectCandidate: (candidate: Candidate) => void;
}) {
  const roleCandidates = role ? candidatesForRole(role.id, candidates) : [];

  return (
    <Dialog open={!!role} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        {role && (
          <>
            <DialogHeader>
              <DialogTitle>{role.title}</DialogTitle>
              <DialogDescription>
                {role.location} · {roleCandidates.length} candidate{roleCandidates.length === 1 ? "" : "s"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {ALL_STAGES.map((stage) => {
                const inStage = roleCandidates.filter((c) => c.stage === stage);
                if (inStage.length === 0) return null;
                return (
                  <div key={stage} className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {stage} · {inStage.length}
                    </p>
                    <div className="space-y-1.5">
                      {inStage.map((candidate) => (
                        <button
                          key={candidate.id}
                          onClick={() => onSelectCandidate(candidate)}
                          className="w-full flex items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                        >
                          <span className="font-medium">{candidate.name}</span>
                          <Badge variant="outline">{daysInStage(candidate.stageEnteredAt)}d</Badge>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              {roleCandidates.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-6">
                  No candidates in the pipeline for this role
                </p>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
