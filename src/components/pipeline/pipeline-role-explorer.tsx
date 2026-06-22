"use client";

import * as React from "react";
import { Candidate, OpenRole } from "@/types";
import { activeCandidateCountForRole } from "@/lib/pipeline-helpers";
import { ViewMode } from "@/components/ui/view-toggle";
import { RoleCard } from "./role-card";
import { RoleListItem } from "./role-list-item";
import { RoleBreakdown } from "./role-breakdown";

export function PipelineRoleExplorer({
  roles,
  candidates,
  view,
  selectedRoleId,
  onSelectRole,
  onSelectCandidate,
}: {
  roles: OpenRole[];
  candidates: Candidate[];
  view: ViewMode;
  selectedRoleId: string | null;
  onSelectRole: (roleId: string) => void;
  onSelectCandidate: (candidate: Candidate) => void;
}) {
  if (roles.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No roles match these filters</p>;
  }

  if (view === "list") {
    return (
      <div className="space-y-2">
        {roles.map((role) => (
          <React.Fragment key={role.id}>
            <RoleListItem
              role={role}
              count={activeCandidateCountForRole(role.id, candidates)}
              selected={role.id === selectedRoleId}
              onSelect={() => onSelectRole(role.id)}
            />
            {role.id === selectedRoleId && (
              <RoleBreakdown role={role} candidates={candidates} onSelectCandidate={onSelectCandidate} />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {roles.map((role) => (
        <React.Fragment key={role.id}>
          <RoleCard
            role={role}
            count={activeCandidateCountForRole(role.id, candidates)}
            selected={role.id === selectedRoleId}
            onSelect={() => onSelectRole(role.id)}
          />
          {role.id === selectedRoleId && (
            <div className="col-span-full">
              <RoleBreakdown role={role} candidates={candidates} onSelectCandidate={onSelectCandidate} />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
