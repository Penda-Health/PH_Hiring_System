"use client";

import * as React from "react";
import { Candidate, OpenRole } from "@/types";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";
import { RolesFilters, RolesFilterState } from "@/components/roles/roles-filters";
import { RolesTable } from "@/components/roles/roles-table";
import { RoleCandidatesDialog } from "@/components/roles/role-candidates-dialog";
import { CandidateDetailDialog } from "@/components/pipeline/candidate-detail-dialog";
import { Card, CardContent } from "@/components/ui/card";

export default function RolesPage() {
  const { candidates, openRoles } = useRecruitmentData();
  const [filters, setFilters] = React.useState<RolesFilterState>({
    segment: "All",
    status: "All",
    priority: "All",
  });
  const [selectedRole, setSelectedRole] = React.useState<OpenRole | null>(null);
  const [selectedCandidate, setSelectedCandidate] = React.useState<Candidate | null>(null);

  const filtered = openRoles.filter((role) => {
    if (filters.segment !== "All" && role.segment !== filters.segment) return false;
    if (filters.status !== "All" && role.status !== filters.status) return false;
    if (filters.priority !== "All" && role.priority !== filters.priority) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Open Roles Register</h1>
      <RolesFilters filters={filters} onChange={setFilters} />
      <Card>
        <CardContent className="p-0">
          <RolesTable roles={filtered} candidates={candidates} onSelectRole={setSelectedRole} />
        </CardContent>
      </Card>
      <RoleCandidatesDialog
        role={selectedRole}
        candidates={candidates}
        onOpenChange={(open) => !open && setSelectedRole(null)}
        onSelectCandidate={setSelectedCandidate}
      />
      <CandidateDetailDialog
        candidate={selectedCandidate}
        onOpenChange={(open) => !open && setSelectedCandidate(null)}
      />
    </div>
  );
}
