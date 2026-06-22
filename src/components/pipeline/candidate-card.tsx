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
  );
}
