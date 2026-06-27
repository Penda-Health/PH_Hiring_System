"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";
import { OpenRole, Segment } from "@/types";
import { cn } from "@/lib/utils";

const SEGMENTS: Segment[] = ["IPS", "SO"];

function groupByDepartment(openRoles: OpenRole[], segment: Segment) {
  const active = openRoles.filter(
    (r) => r.segment === segment && r.status !== "Filled" && r.status !== "Cancelled"
  );
  const byDept = new Map<string, Map<string, number>>();
  for (const role of active) {
    // A role record can have multiple unfilled slots (e.g. hcApproved: 2,
    // hcFilled: 0) — count the remaining headcount gap, not 1 per record.
    const gap = Math.max(role.hcApproved - role.hcFilled, 0);
    if (gap === 0) continue;
    const titles = byDept.get(role.department) ?? new Map<string, number>();
    titles.set(role.title, (titles.get(role.title) ?? 0) + gap);
    byDept.set(role.department, titles);
  }
  return Array.from(byDept.entries())
    .map(([department, titles]) => {
      const roles = Array.from(titles.entries())
        .map(([title, count]) => ({ title, count }))
        .sort((a, b) => b.count - a.count);
      return { department, roles, total: roles.reduce((sum, r) => sum + r.count, 0) };
    })
    .sort((a, b) => b.total - a.total);
}

export function DepartmentPipelineOverview() {
  const { openRoles } = useRecruitmentData();
  const [segment, setSegment] = React.useState<Segment>("IPS");
  const departments = React.useMemo(() => groupByDepartment(openRoles, segment), [openRoles, segment]);
  const totalOpen = React.useMemo(() => departments.reduce((sum, d) => sum + d.total, 0), [departments]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <CardTitle>Pipeline by Department</CardTitle>
          <span className="text-sm font-medium text-muted-foreground">{totalOpen} open</span>
        </div>
        <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
          {SEGMENTS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSegment(s)}
              className={cn(
                "rounded-sm px-2.5 py-1 text-xs font-medium transition-colors",
                segment === s ? "bg-penda-teal text-white" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {departments.length === 0 && (
          <p className="text-sm text-muted-foreground">No active {segment} roles right now.</p>
        )}
        {departments.map((d, i) => {
          const maxTotal = departments[0].total;
          const widthPct = Math.max((d.total / maxTotal) * 100, 14);
          const opacity = 1 - i * (0.5 / departments.length);
          return (
            <div key={d.department} className="space-y-1 text-center">
              <div
                className="mx-auto flex items-center justify-between gap-3 rounded-md px-3 py-2 text-white"
                style={{ width: `${widthPct}%`, minWidth: "9rem", backgroundColor: `rgba(0, 91, 94, ${opacity})` }}
              >
                <span className="truncate text-sm font-medium">{d.department}</span>
                <span className="text-sm font-semibold shrink-0">{d.total}</span>
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {d.roles.map((r) => `${r.title} (${r.count})`).join(" · ")}
              </p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
