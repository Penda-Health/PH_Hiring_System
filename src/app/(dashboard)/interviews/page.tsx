"use client";

import * as React from "react";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";
import { groupByWeek } from "@/lib/interview-helpers";
import { WeekGroup } from "@/components/interviews/week-group";
import { InterviewFilters, InterviewFilterState } from "@/components/interviews/interview-filters";
import { CandidateDetailDialog } from "@/components/pipeline/candidate-detail-dialog";
import { ScheduleInterviewDialog } from "@/components/interviews/schedule-interview-dialog";

export default function InterviewsPage() {
  const { interviews, updateInterview, createInterview, candidates } = useRecruitmentData();
  const [filters, setFilters] = React.useState<InterviewFilterState>({ stage: "All" });
  const [selectedCandidateId, setSelectedCandidateId] = React.useState<string | null>(null);

  const filtered = interviews.filter((i) => filters.stage === "All" || i.stage === filters.stage);
  const weeks = groupByWeek(filtered);
  const selectedCandidate = candidates.find((c) => c.id === selectedCandidateId) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Interview Schedule</h1>
        <ScheduleInterviewDialog candidates={candidates} onCreate={createInterview} />
      </div>
      <InterviewFilters filters={filters} onChange={setFilters} />
      <div className="space-y-4">
        {weeks.map(([weekLabel, weekInterviews]) => (
          <WeekGroup
            key={weekLabel}
            weekLabel={weekLabel}
            interviews={weekInterviews}
            onUpdate={updateInterview}
            onSelectCandidate={setSelectedCandidateId}
          />
        ))}
        {weeks.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No interviews scheduled</p>
        )}
      </div>
      <CandidateDetailDialog
        candidate={selectedCandidate}
        onOpenChange={(open) => !open && setSelectedCandidateId(null)}
      />
    </div>
  );
}
