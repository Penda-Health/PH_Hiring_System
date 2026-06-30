"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";

export interface CandidatesFilterState {
  search: string;
  segment: "All" | "IPS" | "SO";
  department: string;
}

export function CandidatesFilters({
  filters,
  onChange,
}: {
  filters: CandidatesFilterState;
  onChange: (filters: CandidatesFilterState) => void;
}) {
  const { openRoles } = useRecruitmentData();
  const departments = Array.from(
    new Set(
      openRoles
        .filter((r) => filters.segment === "All" || r.segment === filters.segment)
        .map((r) => r.department)
    )
  ).sort();

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Input
        value={filters.search}
        onChange={(e) => onChange({ ...filters, search: e.target.value })}
        placeholder="Search name, email, or phone…"
        className="w-64"
      />

      <Select
        value={filters.segment}
        onValueChange={(v) =>
          onChange({ ...filters, segment: v as CandidatesFilterState["segment"], department: "All" })
        }
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Segment" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="All">All Segments</SelectItem>
          <SelectItem value="IPS">IPS</SelectItem>
          <SelectItem value="SO">SO</SelectItem>
        </SelectContent>
      </Select>

      <Select value={filters.department} onValueChange={(v) => onChange({ ...filters, department: v })}>
        <SelectTrigger className="w-44">
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
    </div>
  );
}
