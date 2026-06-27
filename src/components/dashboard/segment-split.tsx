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
  const totalOpen = splits.reduce((sum, s) => sum + s.openRoleCount, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>IPS vs SO Pipeline Overview</CardTitle>
      </CardHeader>
      <CardContent className="flex items-center gap-6">
        <div className="relative h-36 w-36 shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={splits}
                dataKey="openRoleCount"
                nameKey="segment"
                innerRadius={44}
                outerRadius={64}
                paddingAngle={4}
                cornerRadius={6}
                stroke="none"
              >
                {splits.map((s) => (
                  <Cell key={s.segment} fill={SEGMENT_COLORS[s.segment]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-bold leading-none">{totalOpen}</span>
            <span className="text-[11px] text-muted-foreground">open roles</span>
          </div>
        </div>
        <div className="flex-1 space-y-3">
          {splits.map(({ segment }) => (
            <div key={segment} className="flex items-center gap-3">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: SEGMENT_COLORS[segment] }}
              />
              <Badge variant={segment === "IPS" ? "ips" : "so"}>{segment}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
