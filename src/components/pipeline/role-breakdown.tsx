"use client";

import * as React from "react";
import { Candidate, CandidateStage, OpenRole, RoleStatus } from "@/types";
import { PIPELINE_STAGES } from "@/lib/dashboard-metrics";
import { PipelineColumn } from "./pipeline-column";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";
import { daysOpen } from "@/lib/pipeline-helpers";
import { CalendarDays, User, Briefcase, StickyNote, Minus, Plus } from "lucide-react";

const STATUS_OPTIONS: RoleStatus[] = ["Open", "Allocated", "Filled", "On Hold", "Cancelled"];

function DetailItem({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value?: string | number | null;
}) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium leading-tight">{value}</p>
      </div>
    </div>
  );
}

export function RoleBreakdown({
  role,
  candidates,
  onSelectCandidate,
}: {
  role: OpenRole;
  candidates: Candidate[];
  onSelectCandidate: (candidate: Candidate) => void;
}) {
  const { updateOpenRoleStatus, updateOpenRole, canEdit } = useRecruitmentData();
  const roleCandidates = candidates.filter((c) => c.roleId === role.id);

  const [notes, setNotes] = React.useState(role.notes ?? "");
  const [internalFill, setInternalFill] = React.useState(role.internalFill ?? false);
  const [internalFillName, setInternalFillName] = React.useState(role.internalFillName ?? "");
  const [localHcFilled, setLocalHcFilled] = React.useState(role.hcFilled ?? 0);
  const [localHcApproved, setLocalHcApproved] = React.useState(role.hcApproved ?? 1);

  // Reset text/checkbox fields when a different role is selected
  React.useEffect(() => {
    setNotes(role.notes ?? "");
    setInternalFill(role.internalFill ?? false);
    setInternalFillName(role.internalFillName ?? "");
  }, [role.id]);

  // Sync HC counts whenever Airtable pushes back an update (via polling/focus refresh)
  React.useEffect(() => { setLocalHcFilled(role.hcFilled ?? 0); }, [role.hcFilled]);
  React.useEffect(() => { setLocalHcApproved(role.hcApproved ?? 1); }, [role.hcApproved]);

  function applyHcChange(newFilled: number, newApproved: number) {
    if (!canEdit) return;
    const approved = Math.max(1, newApproved);
    const filled = Math.max(0, Math.min(newFilled, approved));
    setLocalHcFilled(filled);
    setLocalHcApproved(approved);
    const newStatus: OpenRole["status"] =
      filled >= approved ? "Filled" : role.status === "Filled" ? "Open" : role.status;
    updateOpenRole(role.id, {
      hcFilled: filled,
      hcApproved: approved,
      status: newStatus,
      ...(newStatus === "Filled" ? { dateClosed: new Date().toISOString() } : {}),
      ...(newStatus !== "Filled" && role.status === "Filled" ? { dateClosed: null } : {}),
    });
  }

  function setHcFilled(n: number) { applyHcChange(n, localHcApproved); }
  function setHcApproved(n: number) { applyHcChange(localHcFilled, n); }

  function saveNotes() {
    if (!canEdit) return;
    const trimmed = notes.trim();
    if (trimmed === (role.notes ?? "")) return;
    updateOpenRole(role.id, { notes: trimmed || undefined });
  }

  function handleInternalFillToggle(checked: boolean) {
    if (!canEdit) return;
    setInternalFill(checked);
    updateOpenRole(role.id, { internalFill: checked, internalFillName: checked ? internalFillName : undefined });
  }

  function saveInternalFillName() {
    if (!canEdit || !internalFill) return;
    const trimmed = internalFillName.trim();
    if (trimmed === (role.internalFillName ?? "")) return;
    updateOpenRole(role.id, { internalFillName: trimmed || undefined });
  }
  const hasCandidates = roleCandidates.length > 0;
  const byStage = (stage: CandidateStage) => roleCandidates.filter((c) => c.stage === stage);
  const days = daysOpen(role.datePosted);

  const datePostedLabel = role.datePosted
    ? `${new Date(role.datePosted).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })}${days !== null ? ` (${days}d ago)` : ""}`
    : null;

  return (
    <div className="space-y-3 rounded-lg border border-penda-teal/30 bg-muted/30 p-4">
      <div className="flex items-center gap-2 flex-wrap">
        <h2 className="text-lg font-semibold">{role.title}</h2>
        <span className="text-sm text-muted-foreground">{role.location}</span>
        <div className="ml-auto flex items-center gap-2">
          {/* HC filled / approved steppers */}
          <div className="flex items-center gap-0 rounded-md border border-border px-2 py-1 text-sm">
            <span className="text-xs text-muted-foreground mr-1.5">HC</span>
            <button type="button" onClick={() => setHcFilled(localHcFilled - 1)}
              disabled={!canEdit || localHcFilled <= 0}
              className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed">
              <Minus className="h-3 w-3" />
            </button>
            <span className="min-w-[2ch] text-center font-semibold tabular-nums">{localHcFilled}</span>
            <button type="button" onClick={() => setHcFilled(localHcFilled + 1)}
              disabled={!canEdit || localHcFilled >= localHcApproved}
              className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed">
              <Plus className="h-3 w-3" />
            </button>
            <span className="mx-1.5 text-muted-foreground">/</span>
            <button type="button" onClick={() => setHcApproved(localHcApproved - 1)}
              disabled={!canEdit || localHcApproved <= 1}
              className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed">
              <Minus className="h-3 w-3" />
            </button>
            <span className="min-w-[2ch] text-center font-semibold tabular-nums">{localHcApproved}</span>
            <button type="button" onClick={() => setHcApproved(localHcApproved + 1)}
              disabled={!canEdit}
              className="h-5 w-5 flex items-center justify-center rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed">
              <Plus className="h-3 w-3" />
            </button>
            <span className="text-xs text-muted-foreground ml-1">approved</span>
          </div>
          <Select
            value={role.status}
            onValueChange={(v) => updateOpenRoleStatus(role.id, v as RoleStatus)}
            disabled={!canEdit}
          >
            <SelectTrigger
              className="w-32 h-8"
              onClick={(e) => e.stopPropagation()}
              title={canEdit ? undefined : "View only — contact a Recruitment Manager to change status"}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status} value={status}>{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Notes & internal fill — always visible */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <StickyNote className="h-3.5 w-3.5" /> Notes / Comments
          </Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={saveNotes}
            placeholder="Add notes about this role…"
            className="min-h-[60px] resize-none text-sm"
            disabled={!canEdit}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 pt-5">
            <input
              id={`internal-fill-breakdown-${role.id}`}
              type="checkbox"
              checked={internalFill}
              onChange={(e) => handleInternalFillToggle(e.target.checked)}
              disabled={!canEdit}
              className="h-4 w-4 cursor-pointer accent-penda-teal"
            />
            <Label htmlFor={`internal-fill-breakdown-${role.id}`} className="text-sm cursor-pointer select-none">
              Internally filled
            </Label>
          </div>
          {internalFill && (
            <Input
              value={internalFillName}
              onChange={(e) => setInternalFillName(e.target.value)}
              onBlur={saveInternalFillName}
              placeholder="Name of person…"
              className="text-sm h-8"
              disabled={!canEdit}
            />
          )}
        </div>
      </div>

      {hasCandidates ? (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {PIPELINE_STAGES.map((stage) => (
            <PipelineColumn
              key={stage}
              stage={stage}
              candidates={byStage(stage)}
              onSelectCandidate={onSelectCandidate}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-3 pt-1">
          <DetailItem icon={User} label="Recruiter" value={role.recruiter || null} />
          <DetailItem icon={Briefcase} label="Hiring Manager" value={role.hiringManager || null} />
          <DetailItem icon={CalendarDays} label="Date Posted" value={datePostedLabel} />
          <DetailItem icon={Briefcase} label="Employment Type" value={role.employmentType ?? null} />
          <DetailItem icon={Briefcase} label="Department" value={role.department || null} />
          <p className="col-span-full text-xs text-muted-foreground italic">
            No candidates in pipeline yet — add one via &quot;Add Candidate&quot; above.
          </p>
        </div>
      )}
    </div>
  );
}
