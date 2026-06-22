"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RoleStatus, Priority } from "@/types";

export interface RolesFilterState {
  segment: "All" | "IPS" | "SO";
  status: "All" | RoleStatus;
  priority: "All" | Priority;
}

const STATUSES: RoleStatus[] = ["Open", "Filled", "On Hold", "Cancelled"];
const PRIORITIES: Priority[] = ["Critical", "High", "Medium", "Low"];

export function RolesFilters({
  filters,
  onChange,
}: {
  filters: RolesFilterState;
  onChange: (filters: RolesFilterState) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      <Select value={filters.segment} onValueChange={(v) => onChange({ ...filters, segment: v as RolesFilterState["segment"] })}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Segment" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="All">All Segments</SelectItem>
          <SelectItem value="IPS">IPS</SelectItem>
          <SelectItem value="SO">SO</SelectItem>
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
