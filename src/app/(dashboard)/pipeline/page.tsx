"use client";

import * as React from "react";
import { Candidate } from "@/types";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";
import { PipelineFilters, PipelineFilterState } from "@/components/pipeline/pipeline-filters";
import { CandidateDetailDialog } from "@/components/pipeline/candidate-detail-dialog";
import { PipelineRoleExplorer } from "@/components/pipeline/pipeline-role-explorer";
import { NewCandidateDialog } from "@/components/pipeline/new-candidate-dialog";
import { ViewMode, ViewToggle } from "@/components/ui/view-toggle";
import { isRoleInMonthRange } from "@/lib/pipeline-helpers";

export default function PipelinePage() {
  const { candidates, openRoles, createCandidate } = useRecruitmentData();
  const [filters, setFilters] = React.useState<PipelineFilterState>({
    segment: "All",
    recruiter: "All",
    monthRange: "1",
  });
  const [selected, setSelected] = React.useState<Candidate | null>(null);
  const [selectedRoleId, setSelectedRoleId] = React.useState<string | null>(null);
  const [view, setView] = React.useState<ViewMode>("cards");

  const filteredRoles = openRoles.filter((role) => {
    if (filters.segment !== "All" && role.segment !== filters.segment) return false;
    if (filters.recruiter !== "All" && role.recruiter !== filters.recruiter) return false;
    if (!isRoleInMonthRange(role, filters.monthRange)) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Pipeline</h1>
        <NewCandidateDialog roles={openRoles} onCreate={createCandidate} />
      </div>
      <div className="flex items-center justify-between gap-3">
        <PipelineFilters filters={filters} onChange={setFilters} />
        <ViewToggle view={view} onChange={setView} />
      </div>
      <PipelineRoleExplorer
        roles={filteredRoles}
        candidates={candidates}
        view={view}
        selectedRoleId={selectedRoleId}
        onSelectRole={(roleId) => setSelectedRoleId((prev) => (prev === roleId ? null : roleId))}
        onSelectCandidate={setSelected}
      />

      <CandidateDetailDialog candidate={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </div>
  );
}
