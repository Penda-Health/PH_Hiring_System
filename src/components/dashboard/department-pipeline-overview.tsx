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
    const titles = byDept.get(role.department) ?? new Map<string, number>();
    titles.set(role.title, (titles.get(role.title) ?? 0) + 1);
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle>Pipeline by Department</CardTitle>
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
      <CardContent className="space-y-4">
        {departments.length === 0 && (
          <p className="text-sm text-muted-foreground">No active {segment} roles right now.</p>
        )}
        {departments.map((d) => (
          <div key={d.department} className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{d.department}</p>
              <span className="text-xs text-muted-foreground">{d.total} open</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {d.roles.map((r) => (
                <span
                  key={r.title}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-xs"
                >
                  {r.title}
                  <span className="font-semibold text-foreground">{r.count}</span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
