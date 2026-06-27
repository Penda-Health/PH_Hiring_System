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
          <span className="rounded-full border border-penda-teal/30 bg-penda-teal/10 px-2.5 py-1 text-xs font-semibold text-penda-teal">
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
            <DepartmentBar
              key={d.department}
              department={d.department}
              total={d.total}
              roles={d.roles}
              widthPct={widthPct}
              opacity={opacity}
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
}: {
  department: string;
  total: number;
  roles: { title: string; count: number }[];
  widthPct: number;
  opacity: number;
}) {
  const [hovered, setHovered] = React.useState(false);
  const [roleIndex, setRoleIndex] = React.useState(0);

  React.useEffect(() => {
    if (!hovered || roles.length <= 1) return;
    const id = setInterval(() => setRoleIndex((idx) => (idx + 1) % roles.length), 1600);
    return () => clearInterval(id);
  }, [hovered, roles.length]);

  React.useEffect(() => {
    if (!hovered) setRoleIndex(0);
  }, [hovered]);

  const activeRole = roles[roleIndex];

  return (
    <div
      className="relative mx-auto text-center"
      style={{ width: `${widthPct}%`, minWidth: "9rem" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className="flex items-center justify-between gap-3 rounded-md px-3 py-2 text-white transition-transform"
        style={{ backgroundColor: `rgba(0, 91, 94, ${opacity})` }}
      >
        <span className="truncate text-sm font-medium">{department}</span>
        <span className="text-sm font-semibold shrink-0">{total}</span>
      </div>
      <div
        className={cn(
          "overflow-hidden transition-all duration-300 ease-out",
          hovered ? "mt-1 max-h-6 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        {activeRole && (
          <p key={`${department}-${roleIndex}`} className="truncate text-xs text-muted-foreground animate-in fade-in slide-in-from-bottom-1">
            {activeRole.title} ({activeRole.count})
          </p>
        )}
      </div>
    </div>
  );
}
