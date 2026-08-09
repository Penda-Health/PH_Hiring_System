"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { Branch, OpenRole, RoleStatus, Priority } from "@/types";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface RolesFilterState {
  segment: "All" | "IPS" | "SO";
  department: "All" | string;
  status: "All" | RoleStatus;
  priority: "All" | Priority;
  branches: string[]; // selected branch names — only active when segment === "IPS"
}

const STATUSES: RoleStatus[] = ["Open", "Allocated", "Filled", "On Hold", "Cancelled"];
const PRIORITIES: Priority[] = ["Critical", "High", "Medium", "Low"];

function groupByRegion(branches: Branch[]): { region: string; branches: Branch[] }[] {
  const map = new Map<string, Branch[]>();
  for (const b of branches) {
    const r = b.region || "Other";
    if (!map.has(r)) map.set(r, []);
    map.get(r)!.push(b);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([region, branches]) => ({ region, branches }));
}

export function RolesFilters({
  filters,
  branches,
  roles,
  onChange,
}: {
  filters: RolesFilterState;
  branches: Branch[];
  roles: OpenRole[];
  onChange: (filters: RolesFilterState) => void;
}) {
  const ipsBranches = branches.filter((b) => b.active).sort((a, b) => a.name.localeCompare(b.name));
  const grouped = React.useMemo(() => groupByRegion(ipsBranches), [ipsBranches]);

  // Departments scoped to current segment selection
  const departments = React.useMemo(() => {
    const scoped = filters.segment === "All" ? roles : roles.filter((r) => r.segment === filters.segment);
    return Array.from(new Set(scoped.map((r) => r.department))).sort();
  }, [roles, filters.segment]);

  function handleSegmentChange(segment: RolesFilterState["segment"]) {
    onChange({ ...filters, segment, department: "All", branches: [] });
  }

  function toggleBranch(name: string) {
    const next = filters.branches.includes(name)
      ? filters.branches.filter((b) => b !== name)
      : [...filters.branches, name];
    onChange({ ...filters, branches: next });
  }

  const branchLabel =
    filters.branches.length === 0
      ? "All Branches"
      : filters.branches.length === 1
        ? filters.branches[0]
        : `${filters.branches.length} branches`;

  return (
    <div className="flex flex-wrap gap-3">
      <Select value={filters.segment} onValueChange={handleSegmentChange}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Segment" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="All">All Segments</SelectItem>
          <SelectItem value="IPS">IPS</SelectItem>
          <SelectItem value="SO">SO</SelectItem>
        </SelectContent>
      </Select>

      {filters.segment === "IPS" && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={`h-9 gap-1.5 text-sm font-normal ${filters.branches.length > 0 ? "border-penda-blue text-penda-blue" : ""}`}
            >
              {branchLabel}
              <ChevronDown className="h-3.5 w-3.5 opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 max-h-80 overflow-y-auto" align="start">
            {filters.branches.length > 0 && (
              <>
                <button
                  className="w-full px-2 py-1.5 text-left text-xs text-penda-blue hover:underline"
                  onClick={() => onChange({ ...filters, branches: [] })}
                >
                  Clear selection
                </button>
                <DropdownMenuSeparator />
              </>
            )}
            {grouped.map(({ region, branches: regionBranches }, i) => (
              <React.Fragment key={region}>
                {i > 0 && <DropdownMenuSeparator />}
                <DropdownMenuLabel className="text-xs text-muted-foreground">{region}</DropdownMenuLabel>
                {regionBranches.map((branch) => (
                  <DropdownMenuCheckboxItem
                    key={branch.id}
                    checked={filters.branches.includes(branch.name)}
                    onCheckedChange={() => toggleBranch(branch.name)}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {branch.name}
                  </DropdownMenuCheckboxItem>
                ))}
              </React.Fragment>
            ))}
            {grouped.length === 0 && (
              <p className="px-2 py-3 text-xs text-muted-foreground text-center">No branches</p>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      <Select value={filters.department} onValueChange={(v) => onChange({ ...filters, department: v })}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="All Departments" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="All">All Departments</SelectItem>
          {departments.map((dept) => (
            <SelectItem key={dept} value={dept}>{dept}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.status} onValueChange={(v) => onChange({ ...filters, status: v as RolesFilterState["status"] })}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="All">All Statuses</SelectItem>
          {STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {status}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={filters.priority} onValueChange={(v) => onChange({ ...filters, priority: v as RolesFilterState["priority"] })}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="All">All Priorities</SelectItem>
          {PRIORITIES.map((priority) => (
            <SelectItem key={priority} value={priority}>
              {priority}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
