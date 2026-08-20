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
import { Minus, Plus, Pencil, Check, X } from "lucide-react";
import { daysInStage } from "@/lib/pipeline-helpers";
import { candidatesForRole } from "@/lib/roles-helpers";
import { useRoleEditState, HC_STEP, formatHc } from "@/hooks/use-role-edit-state";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";
import { ReplacementRequisitionPicker } from "@/components/roles/replacement-requisition-picker";

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

// Stages that mean a candidate is no longer actively available
const INACTIVE_STAGES = new Set<CandidateStage>(["Hired", "Rejected", "Withdrawn"]);

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
  const { requisitions, openRoles } = useRecruitmentData();
  const roleCandidates = role ? candidatesForRole(role.id, candidates) : [];

  // Candidates with no role assigned, in the same department, still active in pipeline
  const unassignedCandidates = role
    ? candidates.filter(
        (c) =>
          !c.roleId &&
          !INACTIVE_STAGES.has(c.stage) &&
          c.department === role.department
      )
    : [];

  const {
    canEdit,
    canManageRoles,
    title,
    setTitle,
    saveTitle,
    notes,
    setNotes,
    saveNotes,
    internalFill,
    internalFillName,
    setInternalFillName,
    handleInternalFillToggle: saveInternalFill,
    saveInternalFillName,
    linkReplacementRequisition,
    localHcFilled,
    localHcApproved,
    setHcFilled,
    setHcApproved,
  } = useRoleEditState(role);

  // Inline title editing state (manager only)
  const [editingTitle, setEditingTitle] = React.useState(false);
  const titleInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (editingTitle) titleInputRef.current?.focus();
  }, [editingTitle]);

  // Reset editing state when role changes
  React.useEffect(() => { setEditingTitle(false); }, [role?.id]);

  function handleTitleSave() {
    saveTitle();
    setEditingTitle(false);
  }

  function handleTitleCancel() {
    setTitle(role?.title ?? "");
    setEditingTitle(false);
  }

  return (
    <Dialog open={!!role} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" allowOutsideClose>
        {role && (
          <>
            <DialogHeader>
              <DialogTitle asChild>
                <div className="flex items-start gap-2">
                  {editingTitle ? (
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <input
                        ref={titleInputRef}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleTitleSave();
                          if (e.key === "Escape") handleTitleCancel();
                        }}
                        className="flex-1 min-w-0 rounded-md border border-penda-blue bg-background px-2 py-0.5 text-base font-semibold leading-tight focus:outline-none focus:ring-1 focus:ring-penda-blue"
                        placeholder="Role title…"
                      />
                      <button
                        type="button"
                        onClick={handleTitleSave}
                        disabled={!title.trim()}
                        className="shrink-0 rounded-md p-1 text-penda-blue hover:bg-penda-blue/10 disabled:opacity-40"
                        title="Save title"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleTitleCancel}
                        className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted"
                        title="Cancel"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="flex-1 min-w-0 break-words">{role.title}</span>
                      {canManageRoles && (
                        <button
                          type="button"
                          onClick={() => setEditingTitle(true)}
                          className="shrink-0 mt-0.5 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title="Edit role title"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </>
                  )}
                </div>
              </DialogTitle>
              <DialogDescription className="flex items-center gap-3 flex-wrap">
                <span>{role.location} · {roleCandidates.length} candidate{roleCandidates.length === 1 ? "" : "s"}</span>
                {/* HC filled / approved steppers */}
                <div className="flex items-center gap-0 rounded-md border border-border px-2 py-0.5 ml-auto text-sm">
                  <span className="text-xs text-muted-foreground mr-1.5">HC</span>
                  <button type="button" onClick={() => setHcFilled(localHcFilled - HC_STEP)}
                    disabled={!canEdit || localHcFilled <= 0}
                    className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed">
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="min-w-[3ch] text-center font-semibold tabular-nums text-foreground">{formatHc(localHcFilled)}</span>
                  <button type="button" onClick={() => setHcFilled(localHcFilled + HC_STEP)}
                    disabled={!canEdit || localHcFilled >= localHcApproved}
                    className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed">
                    <Plus className="h-3 w-3" />
                  </button>
                  <span className="mx-1.5 text-muted-foreground">/</span>
                  <button type="button" onClick={() => setHcApproved(localHcApproved - HC_STEP)}
                    disabled={!canEdit || localHcApproved <= HC_STEP}
                    className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed">
                    <Minus className="h-3 w-3" />
                  </button>
                  <span className="min-w-[3ch] text-center font-semibold tabular-nums text-foreground">{formatHc(localHcApproved)}</span>
                  <button type="button" onClick={() => setHcApproved(localHcApproved + HC_STEP)}
                    disabled={!canEdit}
                    className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed">
                    <Plus className="h-3 w-3" />
                  </button>
                  <span className="text-xs text-muted-foreground ml-1">approved</span>
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
                  className="h-4 w-4 cursor-pointer accent-penda-blue"
                />
                <Label htmlFor={`internal-fill-${role.id}`} className="text-sm cursor-pointer select-none">
                  Internally filled
                </Label>
              </div>

              {internalFill && (
                <>
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
                  <ReplacementRequisitionPicker
                    role={role}
                    requisitions={requisitions}
                    openRoles={openRoles}
                    canEdit={canEdit}
                    onLink={linkReplacementRequisition}
                  />
                </>
              )}
            </div>

            {/* Candidates linked to this role, grouped by stage */}
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
                <p className="text-sm text-muted-foreground text-center py-2">
                  No candidates assigned to this role yet.
                </p>
              )}
            </div>

            {/* Unassigned candidates in the same department */}
            {unassignedCandidates.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Unassigned · {unassignedCandidates.length}
                </p>
                <p className="text-xs text-muted-foreground">
                  Pipeline candidates in <span className="font-medium">{role?.department}</span> not yet assigned to a role.
                </p>
                <div className="space-y-1.5">
                  {unassignedCandidates.map((candidate) => (
                    <button
                      key={candidate.id}
                      onClick={() => onSelectCandidate(candidate)}
                      className="w-full flex items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                    >
                      <span className="font-medium">{candidate.name}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="outline" className="text-xs">{candidate.stage}</Badge>
                        <Badge variant="outline" className="text-xs">{daysInStage(candidate.stageEnteredAt)}d</Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
