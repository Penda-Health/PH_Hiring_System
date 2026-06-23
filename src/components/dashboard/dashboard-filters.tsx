"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";
import {
  DashboardFilterState,
  DashboardPeriod,
  DEFAULT_DASHBOARD_FILTERS,
  PERIOD_LABELS,
  getDashboardFilterOptions,
} from "@/lib/dashboard-filters";

const PERIODS: DashboardPeriod[] = ["all", "7d", "30d", "mtd", "qtd"];

export function DashboardFilters({
  filters,
  onChange,
}: {
  filters: DashboardFilterState;
  onChange: (filters: DashboardFilterState) => void;
}) {
  const { openRoles, branches } = useRecruitmentData();
  const { departments, roles, branchOptions } = getDashboardFilterOptions(openRoles, branches);
  const isDefault = JSON.stringify(filters) === JSON.stringify(DEFAULT_DASHBOARD_FILTERS);

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select value={filters.branchId} onValueChange={(v) => onChange({ ...filters, branchId: v })}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Branch" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="All">All Branches</SelectItem>
          {branchOptions.map((b) => (
            <SelectItem key={b.id} value={b.id}>
              {b.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.department} onValueChange={(v) => onChange({ ...filters, department: v })}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Department" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="All">All Departments</SelectItem>
          {departments.map((d) => (
            <SelectItem key={d} value={d}>
              {d}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.role} onValueChange={(v) => onChange({ ...filters, role: v })}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="All">All Roles</SelectItem>
          {roles.map((r) => (
            <SelectItem key={r} value={r}>
              {r}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.period} onValueChange={(v) => onChange({ ...filters, period: v as DashboardPeriod })}>
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Time Period" />
        </SelectTrigger>
        <SelectContent>
          {PERIODS.map((p) => (
            <SelectItem key={p} value={p}>
              {PERIOD_LABELS[p]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!isDefault && (
        <Button variant="ghost" size="sm" onClick={() => onChange(DEFAULT_DASHBOARD_FILTERS)}>
          Reset
        </Button>
      )}
    </div>
  );
}
