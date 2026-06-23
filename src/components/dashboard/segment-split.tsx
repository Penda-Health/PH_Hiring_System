"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSegmentSplit } from "@/lib/dashboard-metrics";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";
import { DashboardFilterState, filterDashboardData } from "@/lib/dashboard-filters";

export function SegmentSplit({ filters }: { filters: DashboardFilterState }) {
  const { openRoles, candidates, offers, workTrials, interviews, relievers, locums } = useRecruitmentData();
  const filtered = filterDashboardData(
    { openRoles, candidates, offers, workTrials, interviews, relievers, locums },
    filters
  );
  const splits = getSegmentSplit(filtered.openRoles, filtered.candidates);

  return (
    <Card>
      <CardHeader>
        <CardTitle>IPS vs SO</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4">
        {splits.map(({ segment, candidateCount, openRoleCount }) => (
          <div key={segment} className="rounded-lg border border-border p-4 space-y-2">
            <Badge variant={segment === "IPS" ? "ips" : "so"}>{segment}</Badge>
            <p className="text-2xl font-semibold">{candidateCount}</p>
            <p className="text-xs text-muted-foreground">in pipeline · {openRoleCount} open roles</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
