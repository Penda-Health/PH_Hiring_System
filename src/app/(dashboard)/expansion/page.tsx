"use client";

import * as React from "react";
import { Candidate, OpenRole, RoleStatus } from "@/types";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";
import { expansionBranches, fillType, FillType, isExpansionRole, roleBranchIds, summarizeExpansion } from "@/lib/expansion-helpers";
import { ExpansionRolesTable } from "@/components/roles/expansion-roles-table";
import { RoleCandidatesDialog } from "@/components/roles/role-candidates-dialog";
import { CandidateDetailDialog } from "@/components/pipeline/candidate-detail-dialog";
import { NewOpenRoleDialog } from "@/components/pipeline/new-open-role-dialog";
import { NewBranchDialog } from "@/components/branches/new-branch-dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";

const STATUSES: RoleStatus[] = ["Open", "Allocated", "Filled", "On Hold", "Cancelled"];
const FILL_TYPES: FillType[] = ["Internal", "External", "Unfilled"];

export default function ExpansionPage() {
  const { branches, openRoles, candidates, requisitions, createOpenRole, createBranch, canEdit } =
    useRecruitmentData();
  const branchesInScope = React.useMemo(() => expansionBranches(branches), [branches]);

  const [branchFilter, setBranchFilter] = React.useState<"All" | string>("All");
  const [statusFilter, setStatusFilter] = React.useState<"All" | RoleStatus>("All");
  const [fillTypeFilter, setFillTypeFilter] = React.useState<"All" | FillType>("All");

  const [selectedRole, setSelectedRole] = React.useState<OpenRole | null>(null);
  const [selectedCandidate, setSelectedCandidate] = React.useState<Candidate | null>(null);

  // A role counts as in-scope only if every branch it's linked to is an
  // expansion branch (see isExpansionRole) — a bulk role shared across many
  // existing branches that merely happens to include Kinoo/G44 doesn't
  // belong here; only roles genuinely mapped to just the expansion
  // branch(es) do.
  const expansionRoles = React.useMemo(
    () => openRoles.filter((r) => isExpansionRole(r, branches)),
    [openRoles, branches]
  );

  const summary = React.useMemo(
    () => summarizeExpansion(expansionRoles, requisitions, openRoles),
    [expansionRoles, requisitions, openRoles]
  );

  const filtered = expansionRoles.filter((role) => {
    if (branchFilter !== "All" && !roleBranchIds(role).includes(branchFilter)) return false;
    if (statusFilter !== "All" && role.status !== statusFilter) return false;
    if (fillTypeFilter !== "All" && fillType(role) !== fillTypeFilter) return false;
    return true;
  });

  if (branchesInScope.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl font-semibold">Expansion Tracker</h1>
          {canEdit && <NewBranchDialog branches={branches} onCreate={createBranch} expansionContext />}
        </div>
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No branches are flagged for expansion yet. Add one above, or mark an existing branch as an expansion
            branch to see it here.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Expansion Tracker</h1>
          <p className="text-sm text-muted-foreground">
            Open roles for {branchesInScope.map((b) => b.name).join(" and ")}, and whether each seat vacated by an
            internal move has a replacement raised yet.
          </p>
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <NewBranchDialog branches={branches} onCreate={createBranch} expansionContext />
            {/* Same dialog as Pipeline's "New Open Role", scoped to just the
                expansion branches — so adding a Kinoo/G44 role doesn't mean
                hunting for it in the full branch list. */}
            <NewOpenRoleDialog branches={branchesInScope} openRoles={openRoles} onCreate={createOpenRole} />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatCard label="Total Roles" value={summary.roleCount} />
        <StatCard label="Internal Fill" value={summary.internal} />
        <StatCard label="External Hire" value={summary.external} />
        <StatCard label="Unfilled" value={summary.unfilled} />
        <StatCard
          label="Pending Replacement"
          value={summary.pendingReplacements}
          highlight={summary.pendingReplacements > 0}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-1.5">
          <Button
            variant={branchFilter === "All" ? "default" : "outline"}
            size="sm"
            className={branchFilter === "All" ? "bg-penda-blue hover:bg-penda-blue-dark" : ""}
            onClick={() => setBranchFilter("All")}
          >
            All Branches
          </Button>
          {branchesInScope.map((b) => (
            <Button
              key={b.id}
              variant={branchFilter === b.id ? "default" : "outline"}
              size="sm"
              className={branchFilter === b.id ? "bg-penda-blue hover:bg-penda-blue-dark" : ""}
              onClick={() => setBranchFilter(b.id)}
            >
              {b.name}
            </Button>
          ))}
        </div>

        <Select value={fillTypeFilter} onValueChange={(v) => setFillTypeFilter(v as "All" | FillType)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Fill Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Fill Types</SelectItem>
            {FILL_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as "All" | RoleStatus)}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All Statuses</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <ExpansionRolesTable
            roles={filtered}
            candidates={candidates}
            requisitions={requisitions}
            openRoles={openRoles}
            onSelectRole={setSelectedRole}
          />
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

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-2xl font-semibold ${highlight ? "text-critical-fg" : ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
