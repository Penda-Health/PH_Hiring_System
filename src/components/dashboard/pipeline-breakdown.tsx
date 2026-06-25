"use client";

import Link from "next/link";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getStageCounts } from "@/lib/dashboard-metrics";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";
import { DashboardFilterState, filterDashboardData } from "@/lib/dashboard-filters";

const BAR_COLOR = "#005B5E";

export function PipelineBreakdown({ filters }: { filters: DashboardFilterState }) {
  const { candidates, openRoles, offers, workTrials, interviews, relievers, locums } = useRecruitmentData();
  const { candidates: filteredCandidates } = filterDashboardData(
    { candidates, openRoles, offers, workTrials, interviews, relievers, locums },
    filters
  );
  const stageCounts = getStageCounts(filteredCandidates);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Pipeline by Stage</CardTitle>
        <Link href="/pipeline" className="text-xs font-medium text-penda-teal hover:underline">
          View full pipeline →
        </Link>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={stageCounts} layout="vertical" margin={{ left: 16, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5ECEB" />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="stage" width={110} tick={{ fontSize: 12 }} />
            <Tooltip cursor={{ fill: "#F1F8F6" }} />
            <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={18}>
              {stageCounts.map((entry) => (
                <Cell key={entry.stage} fill={BAR_COLOR} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
