"use client";

import * as React from "react";
import { Candidate } from "@/types";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";
import { CANDIDATE_STAGE_GROUPS, getCandidateStageGroupId } from "@/lib/candidate-stage-groups";
import { CandidatesFilters, CandidatesFilterState } from "@/components/candidates/candidates-filters";
import { CandidatesViewToggle, CandidatesViewMode } from "@/components/candidates/candidates-view-toggle";
import { CandidatesTable } from "@/components/candidates/candidates-table";
import { CandidateGroupColumn } from "@/components/candidates/candidate-group-column";
import { MoveStageDialog } from "@/components/candidates/move-stage-dialog";
import { CandidateDetailDialog } from "@/components/pipeline/candidate-detail-dialog";
import { NewCandidateDialog } from "@/components/pipeline/new-candidate-dialog";
import { ScheduleInterviewDialog } from "@/components/interviews/schedule-interview-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 20;

export default function CandidatesPage() {
  const { candidates, openRoles, createCandidate, updateCandidateStage, createInterview } = useRecruitmentData();

  const [filters, setFilters] = React.useState<CandidatesFilterState>({
    search: "",
    segment: "All",
    department: "All",
  });
  const [statusGroup, setStatusGroup] = React.useState("all");
  const [view, setView] = React.useState<CandidatesViewMode>("list");
  const [page, setPage] = React.useState(0);

  const [viewingCandidate, setViewingCandidate] = React.useState<Candidate | null>(null);
  const [movingCandidate, setMovingCandidate] = React.useState<Candidate | null>(null);
  const [schedulingCandidate, setSchedulingCandidate] = React.useState<Candidate | null>(null);

  const roleById = React.useMemo(() => new Map(openRoles.map((r) => [r.id, r])), [openRoles]);

  const filtered = React.useMemo(() => {
    const search = filters.search.trim().toLowerCase();
    return candidates.filter((c) => {
      const role = roleById.get(c.roleId);
      if (filters.segment !== "All" && role?.segment !== filters.segment) return false;
      if (filters.department !== "All" && role?.department !== filters.department) return false;
      if (statusGroup !== "all" && getCandidateStageGroupId(c.stage) !== statusGroup) return false;
      if (search && !`${c.name} ${c.email} ${c.phone}`.toLowerCase().includes(search)) return false;
      return true;
    });
  }, [candidates, roleById, filters, statusGroup]);

  React.useEffect(() => setPage(0), [filters, statusGroup]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function handleReject(candidate: Candidate) {
    if (!window.confirm(`Reject ${candidate.name}?`)) return;
    updateCandidateStage(candidate.id, "Rejected");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Candidates</h1>
        <NewCandidateDialog roles={openRoles} onCreate={createCandidate} />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <CandidatesFilters filters={filters} onChange={setFilters} />
        <CandidatesViewToggle view={view} onChange={setView} />
      </div>

      <Tabs value={statusGroup} onValueChange={setStatusGroup}>
        <TabsList className="h-auto flex-wrap justify-start gap-1">
          <TabsTrigger value="all" className="gap-1.5">
            All
            <Badge variant="secondary">{candidates.length}</Badge>
          </TabsTrigger>
          {CANDIDATE_STAGE_GROUPS.map((group) => {
            const count = candidates.filter((c) => getCandidateStageGroupId(c.stage) === group.id).length;
            return (
              <TabsTrigger key={group.id} value={group.id} className="gap-1.5">
                {group.label}
                <Badge variant="secondary">{count}</Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>

      {view === "list" ? (
        <>
          <CandidatesTable
            candidates={paged}
            openRoles={openRoles}
            onViewProfile={setViewingCandidate}
            onMoveStage={setMovingCandidate}
            onScheduleInterview={setSchedulingCandidate}
            onReject={handleReject}
          />
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </Button>
              <span>
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              >
                Next
              </Button>
            </div>
          )}
        </>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2">
          {CANDIDATE_STAGE_GROUPS.map((group) => (
            <CandidateGroupColumn
              key={group.id}
              label={group.label}
              candidates={filtered.filter((c) => getCandidateStageGroupId(c.stage) === group.id)}
              onSelectCandidate={setViewingCandidate}
            />
          ))}
        </div>
      )}

      <CandidateDetailDialog
        candidate={viewingCandidate}
        onOpenChange={(open) => !open && setViewingCandidate(null)}
      />
      <MoveStageDialog
        candidate={movingCandidate}
        onOpenChange={(open) => !open && setMovingCandidate(null)}
        onMove={updateCandidateStage}
      />
      <ScheduleInterviewDialog
        candidates={candidates}
        onCreate={createInterview}
        defaultCandidateId={schedulingCandidate?.id}
        open={!!schedulingCandidate}
        onOpenChange={(open) => !open && setSchedulingCandidate(null)}
      />
    </div>
  );
}
