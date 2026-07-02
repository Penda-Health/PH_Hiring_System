"use client";

import * as React from "react";
import { Candidate, CandidateStage, OpenRole, RoleStatus } from "@/types";
import { PIPELINE_STAGES } from "@/lib/dashboard-metrics";
import { PipelineColumn } from "./pipeline-column";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";
import { daysOpen } from "@/lib/pipeline-helpers";
import { CalendarDays, User, Briefcase, StickyNote, Users } from "lucide-react";

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
  const { updateOpenRoleStatus, canEdit } = useRecruitmentData();
  const roleCandidates = candidates.filter((c) => c.roleId === role.id);
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
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold">{role.title}</h2>
        <span className="text-sm text-muted-foreground">{role.location}</span>
        <Select
          value={role.status}
          onValueChange={(v) => updateOpenRoleStatus(role.id, v as RoleStatus)}
          disabled={!canEdit}
        >
          <SelectTrigger
            className="w-32 h-8 ml-auto"
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
          <DetailItem
            icon={Users}
            label="Headcount"
            value={`${role.hcFilled} filled / ${role.hcApproved} approved`}
          />
          <DetailItem icon={CalendarDays} label="Date Posted" value={datePostedLabel} />
          <DetailItem icon={Briefcase} label="Employment Type" value={role.employmentType ?? null} />
          <DetailItem icon={Briefcase} label="Department" value={role.department || null} />
          {role.notes && (
            <div className="col-span-full flex items-start gap-2">
              <StickyNote className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Notes</p>
                <p className="text-sm whitespace-pre-wrap">{role.notes}</p>
              </div>
            </div>
          )}
          <p className="col-span-full text-xs text-muted-foreground italic">
            No candidates in pipeline yet — add one via &quot;Add Candidate&quot; above.
          </p>
        </div>
      )}
    </div>
  );
}
