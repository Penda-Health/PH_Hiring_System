"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { interviewStages } from "@/lib/interview-helpers";

export interface InterviewFilterState {
  stage: "All" | (typeof interviewStages)[number];
}

export function InterviewFilters({
  filters,
  onChange,
}: {
  filters: InterviewFilterState;
  onChange: (filters: InterviewFilterState) => void;
}) {
  return (
    <Select
      value={filters.stage}
      onValueChange={(v) => onChange({ stage: v as InterviewFilterState["stage"] })}
    >
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Stage" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="All">All Stages</SelectItem>
        {interviewStages.map((stage) => (
          <SelectItem key={stage} value={stage}>
            {stage}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
