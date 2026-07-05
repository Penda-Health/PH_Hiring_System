"use client";

import * as React from "react";
import { Candidate, CandidateStage, OpenRole } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Minus, Plus } from "lucide-react";
import { daysInStage } from "@/lib/pipeline-helpers";
import { candidatesForRole } from "@/lib/roles-helpers";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";

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
  const { updateOpenRole, canEdit } = useRecruitmentData();
  const roleCandidates = role ? candidatesForRole(role.id, candidates) : [];

  const [notes, setNotes] = React.useState(role?.notes ?? "");
  const [internalFill, setInternalFill] = React.useState(role?.internalFill ?? false);
  const [internalFillName, setInternalFillName] = React.useState(role?.internalFillName ?? "");
  const [localHcFilled, setLocalHcFilled] = React.useState(role?.hcFilled ?? 0);

  React.useEffect(() => {
    setNotes(role?.notes ?? "");
    setInternalFill(role?.internalFill ?? false);
    setInternalFillName(role?.internalFillName ?? "");
    setLocalHcFilled(role?.hcFilled ?? 0);
  }, [role?.id]);

  function setHcFilled(newFilled: number) {
    if (!role || !canEdit) return;
    const clamped = Math.max(0, Math.min(newFilled, role.hcApproved));
    setLocalHcFilled(clamped);
    const newStatus: OpenRole["status"] =
      clamped >= role.hcApproved ? "Filled" : role.status === "Filled" ? "Open" : role.status;
    updateOpenRole(role.id, {
      hcFilled: clamped,
      status: newStatus,
      ...(newStatus === "Filled" ? { dateClosed: new Date().toISOString() } : {}),
      ...(newStatus !== "Filled" && role.status === "Filled" ? { dateClosed: undefined } : {}),
    });
  }

  function saveNotes() {
    if (!role || !canEdit) return;
    const trimmed = notes.trim();
    if (trimmed === (role.notes ?? "")) return;
    updateOpenRole(role.id, { notes: trimmed || undefined });
  }

  function saveInternalFill(checked: boolean) {
    if (!role || !canEdit) return;
    setInternalFill(checked);
    updateOpenRole(role.id, { internalFill: checked, internalFillName: checked ? internalFillName : undefined });
  }

  function saveInternalFillName() {
    if (!role || !canEdit || !internalFill) return;
    const trimmed = internalFillName.trim();
    if (trimmed === (role.internalFillName ?? "")) return;
    updateOpenRole(role.id, { internalFillName: trimmed || undefined });
  }

  return (
    <Dialog open={!!role} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" allowOutsideClose>
        {role && (
          <>
            <DialogHeader>
              <DialogTitle>{role.title}</DialogTitle>
              <DialogDescription className="flex items-center gap-3 flex-wrap">
                <span>{role.location} · {roleCandidates.length} candidate{roleCandidates.length === 1 ? "" : "s"}</span>
                {/* HC filled stepper */}
                <div className="flex items-center gap-1 rounded-md border border-border px-2 py-0.5 ml-auto">
                  <span className="text-xs text-muted-foreground mr-0.5">HC filled</span>
                  <button
                    type="button"
                    onClick={() => setHcFilled(localHcFilled - 1)}
                    disabled={!canEdit || localHcFilled <= 0}
                    className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="min-w-[2ch] text-center text-sm font-semibold tabular-nums text-foreground">{localHcFilled}</span>
                  <span className="text-xs text-muted-foreground">/ {role.hcApproved}</span>
                  <button
                    type="button"
                    onClick={() => setHcFilled(localHcFilled + 1)}
                    disabled={!canEdit || localHcFilled >= role.hcApproved}
                    className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                </div>
              </DialogDescription>
            </DialogHeader>

            {/* Notes & internal fill */}
            <div className="space-y-3 rounded-md border border-border bg-muted/30 px-3 py-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Notes / Comments</Label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={saveNotes}
                  placeholder="Add notes about this role…"
                  className="min-h-[64px] resize-none text-sm"
                  disabled={!canEdit}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id={`internal-fill-${role.id}`}
                  type="checkbox"
                  checked={internalFill}
                  onChange={(e) => saveInternalFill(e.target.checked)}
                  disabled={!canEdit}
                  className="h-4 w-4 cursor-pointer accent-penda-teal"
                />
                <Label htmlFor={`internal-fill-${role.id}`} className="text-sm cursor-pointer select-none">
                  Internally filled
                </Label>
              </div>

              {internalFill && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Name of person</Label>
                  <Input
                    value={internalFillName}
                    onChange={(e) => setInternalFillName(e.target.value)}
                    onBlur={saveInternalFillName}
                    placeholder="Enter name…"
                    className="text-sm h-8"
                    disabled={!canEdit}
                  />
                </div>
              )}
            </div>

            {/* Candidates by stage */}
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
                <p className="text-sm text-muted-foreground text-center py-4">
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
