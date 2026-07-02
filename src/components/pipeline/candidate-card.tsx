"use client";

import { Candidate } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getRoleForCandidate, daysInStage } from "@/lib/pipeline-helpers";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";

export function CandidateCard({
  candidate,
  onClick,
}: {
  candidate: Candidate;
  onClick: () => void;
}) {
  const { openRoles } = useRecruitmentData();
  const role = getRoleForCandidate(candidate, openRoles);
  const days = daysInStage(candidate.stageEnteredAt);

  return (
    <div className="group relative">
      <Card
        onClick={onClick}
        className="cursor-pointer hover:border-penda-teal transition-colors"
      >
        <CardContent className="p-3 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium leading-tight">{candidate.name}</p>
            {role && <Badge variant={role.segment === "IPS" ? "ips" : "so"}>{role.segment}</Badge>}
          </div>
          <p className="text-xs text-muted-foreground">{role?.title ?? "Unknown role"}</p>
          <div className="flex items-center justify-between">
            {role && (
              <Badge variant={role.priority === "Critical" ? "critical" : role.priority === "High" ? "high" : "outline"}>
                {role.priority}
              </Badge>
            )}
            <span className="text-xs text-muted-foreground">{days}d in stage</span>
          </div>
        </CardContent>
      </Card>

      {/* Hover detail panel */}
      <div className="pointer-events-none absolute bottom-full left-0 z-50 mb-1.5 w-56 rounded-md border border-border bg-popover text-popover-foreground shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-150 p-3 space-y-2">
        <p className="text-xs font-semibold leading-tight">{candidate.name}</p>
        {candidate.phone && (
          <p className="text-xs text-muted-foreground">{candidate.phone}</p>
        )}
        {candidate.email && (
          <p className="text-xs text-muted-foreground truncate">{candidate.email}</p>
        )}
        <div className="flex flex-wrap gap-1 pt-0.5">
          {candidate.employmentType && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{candidate.employmentType}</span>
          )}
          {candidate.source && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{candidate.source}</span>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">{days} days in stage · click to open</p>
      </div>
    </div>
  );
}
