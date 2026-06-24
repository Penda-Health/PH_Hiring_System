"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getUniqueRecruiters, MONTH_RANGE_OPTIONS, MonthRangeOption } from "@/lib/pipeline-helpers";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";

export interface PipelineFilterState {
  segment: "All" | "IPS" | "SO";
  recruiter: string;
  monthRange: MonthRangeOption;
}

export function PipelineFilters({
  filters,
  onChange,
}: {
  filters: PipelineFilterState;
  onChange: (filters: PipelineFilterState) => void;
}) {
  const { openRoles } = useRecruitmentData();
  const uniqueRecruiters = getUniqueRecruiters(openRoles);

  return (
    <div className="flex flex-wrap gap-3">
      <Select
        value={filters.segment}
        onValueChange={(v) => onChange({ ...filters, segment: v as PipelineFilterState["segment"] })}
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

      <Select
        value={filters.recruiter}
        onValueChange={(v) => onChange({ ...filters, recruiter: v })}
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Recruiter" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="All">All Recruiters</SelectItem>
          {uniqueRecruiters.map((recruiter) => (
            <SelectItem key={recruiter} value={recruiter}>
              {recruiter}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.monthRange}
        onValueChange={(v) => onChange({ ...filters, monthRange: v as MonthRangeOption })}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Time range" />
        </SelectTrigger>
        <SelectContent>
          {MONTH_RANGE_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
