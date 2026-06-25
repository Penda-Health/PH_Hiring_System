"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getSegmentSplit } from "@/lib/dashboard-metrics";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";
import { DashboardFilterState, filterDashboardData } from "@/lib/dashboard-filters";

const SEGMENT_COLORS: Record<string, string> = { IPS: "#085041", SO: "#0C447C" };

export function SegmentSplit({ filters }: { filters: DashboardFilterState }) {
  const { openRoles, candidates, offers, workTrials, interviews, relievers, locums } = useRecruitmentData();
  const filtered = filterDashboardData(
    { openRoles, candidates, offers, workTrials, interviews, relievers, locums },
    filters
  );
  const splits = getSegmentSplit(filtered.openRoles, filtered.candidates);
  const total = splits.reduce((sum, s) => sum + s.candidateCount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>IPS vs SO Pipeline Split</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-4">
        <div className="relative h-32 w-32 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={splits}
                dataKey="candidateCount"
                nameKey="segment"
                innerRadius={36}
                outerRadius={56}
                paddingAngle={2}
              >
                {splits.map((s) => (
                  <Cell key={s.segment} fill={SEGMENT_COLORS[s.segment]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-lg font-semibold">{total}</span>
          </div>
        </div>
        <div className="flex-1 space-y-2">
          {splits.map(({ segment, candidateCount, openRoleCount }) => (
            <div key={segment} className="flex items-center justify-between text-sm">
              <Badge variant={segment === "IPS" ? "ips" : "so"}>{segment}</Badge>
              <span className="text-muted-foreground">
                {candidateCount} in pipeline · {openRoleCount} open
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
