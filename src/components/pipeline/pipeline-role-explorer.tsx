"use client";

import * as React from "react";
import { Candidate, OpenRole } from "@/types";
import {
  activeCandidateCountForRole,
  compareRoleGroups,
  roleGroup,
  RoleGroup,
  summarizeHeadcount,
} from "@/lib/pipeline-helpers";
import { ViewMode } from "@/components/ui/view-toggle";
import { RoleCard } from "./role-card";
import { RoleListItem } from "./role-list-item";
import { RoleBreakdown } from "./role-breakdown";

const GROUP_ORDER: RoleGroup[] = ["Open", "Allocated", "Closed"];

function groupRoles(roles: OpenRole[]): { group: RoleGroup; roles: OpenRole[] }[] {
  return GROUP_ORDER.map((group) => ({
    group,
    roles: roles.filter((r) => roleGroup(r) === group),
  })).filter((g) => g.roles.length > 0);
}

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

  const sorted = [...roles].sort(compareRoleGroups);
  const groups = groupRoles(sorted);

  return (
    <div className="space-y-6">
      {groups.map(({ group, roles: groupRolesList }) => {
        const hc = summarizeHeadcount(groupRolesList);
        return (
        <div key={group} className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {group}{" "}
            <span className="font-normal">
              ({hc.roleCount} role{hc.roleCount === 1 ? "" : "s"} · {hc.filled}/{hc.approved} HC filled
              {hc.remaining > 0 ? `, ${hc.remaining} open` : ""})
            </span>
          </h2>
          {view === "list" ? (
            <div className="space-y-2">
              {groupRolesList.map((role) => (
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
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {groupRolesList.map((role) => (
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
          )}
        </div>
        );
      })}
    </div>
  );
}
