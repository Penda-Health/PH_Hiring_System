"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";
import { OpenRole, Segment } from "@/types";
import { cn } from "@/lib/utils";

const SEGMENTS: Segment[] = ["IPS", "SO"];

// Matches segment-split.tsx's donut colors (#0EA968 / #2563EB) — a brighter,
// hue-distinct pair chosen because the brand ips/so Badge tokens are both
// dark and desaturated, reading as near-identical at a glance.
const SEGMENT_RGB: Record<Segment, string> = {
  IPS: "14, 169, 104",
  SO: "37, 99, 235",
};

function groupByDepartment(openRoles: OpenRole[], segment: Segment) {
  // "Open" only, matching the dashboard-wide HC Remaining convention
  // (dashboard-metrics.ts) — Allocated/On Hold/Filled/Cancelled are excluded.
  const active = openRoles.filter((r) => r.segment === segment && r.status === "Open");
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
          <span className="rounded-full bg-penda-blue px-2.5 py-1 text-xs font-semibold text-white">
            {totalOpen} open
          </span>
        </div>
        <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
          {SEGMENTS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSegment(s)}
              className={cn(
                "rounded-sm px-2.5 py-1 text-xs font-medium transition-colors",
                segment === s ? "bg-penda-blue text-white" : "text-muted-foreground hover:text-foreground"
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
            <DepartmentBar
              key={d.department}
              department={d.department}
              total={d.total}
              roles={d.roles}
              widthPct={widthPct}
              opacity={opacity}
              rgb={SEGMENT_RGB[segment]}
            />
          );
        })}
      </CardContent>
    </Card>
  );
}

function DepartmentBar({
  department,
  total,
  roles,
  widthPct,
  opacity,
  rgb,
}: {
  department: string;
  total: number;
  roles: { title: string; count: number }[];
  widthPct: number;
  opacity: number;
  rgb: string;
}) {
  return (
    <div
      className="mx-auto"
      style={{ width: `${widthPct}%`, minWidth: "9rem" }}
    >
      <div
        className="rounded-md px-3 py-2 text-white space-y-1"
        style={{ backgroundColor: `rgba(${rgb}, ${opacity})` }}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="truncate text-sm font-semibold">{department}</span>
          <span className="text-sm font-semibold shrink-0">{total}</span>
        </div>
        {roles.length > 0 && (
          <div className="flex flex-wrap items-center gap-x-0 gap-y-0.5">
            {roles.map((r, i) => (
              <React.Fragment key={r.title}>
                {i > 0 && (
                  <span className="mx-1.5 select-none text-[10px] text-white/40">|</span>
                )}
                <span className="text-[11px] text-white/80 leading-tight">
                  {r.title}&nbsp;<span className="font-semibold text-white/95">{r.count}</span>
                </span>
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
