"use client";

import { Branch, RoleStatus, Priority } from "@/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface RolesFilterState {
  segment: "All" | "IPS" | "SO";
  status: "All" | RoleStatus;
  priority: "All" | Priority;
  branch: string; // "All" or a branch name — only active when segment === "IPS"
}

const STATUSES: RoleStatus[] = ["Open", "Filled", "On Hold", "Cancelled"];
const PRIORITIES: Priority[] = ["Critical", "High", "Medium", "Low"];

export function RolesFilters({
  filters,
  branches,
  onChange,
}: {
  filters: RolesFilterState;
  branches: Branch[];
  onChange: (filters: RolesFilterState) => void;
}) {
  const ipsBranches = branches.filter((b) => b.active).sort((a, b) => a.name.localeCompare(b.name));

  function handleSegmentChange(segment: RolesFilterState["segment"]) {
    // Reset branch filter when leaving IPS
    onChange({ ...filters, segment, branch: "All" });
  }

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
        <Select value={filters.branch} onValueChange={(v) => onChange({ ...filters, branch: v })}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="All Branches" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Branches</SelectItem>
            {ipsBranches.map((branch) => (
              <SelectItem key={branch.id} value={branch.name}>
                {branch.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

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
