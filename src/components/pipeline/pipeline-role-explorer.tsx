"use client";

import * as React from "react";
import { Candidate, OpenRole } from "@/types";
import {
  compareRoleGroups,
  roleGroup,
  RoleGroup,
  summarizeHeadcount,
} from "@/lib/pipeline-helpers";
import { ACTIVE_CANDIDATE_STAGE_EXCLUSIONS } from "@/lib/roles-helpers";
import { ViewMode } from "@/components/ui/view-toggle";
import { RoleCard } from "./role-card";
import { RoleListItem } from "./role-list-item";
import { RoleBreakdown } from "./role-breakdown";

const GROUP_ORDER: RoleGroup[] = ["Open", "Allocated", "On Hold", "Closed"];

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
  // activeCandidateCountForRole() used to be called per role, each filtering
  // the whole candidates array — O(roles * candidates) per render. Build the
  // per-role counts once instead. Computed before the early return below to
  // keep this hook call unconditional.
  const activeCountByRoleId = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of candidates) {
      if (!c.roleId || ACTIVE_CANDIDATE_STAGE_EXCLUSIONS.has(c.stage)) continue;
      counts.set(c.roleId, (counts.get(c.roleId) ?? 0) + 1);
    }
    return counts;
  }, [candidates]);

  if (roles.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No roles match these filters</p>;
  }

  const sorted = [...roles].sort(compareRoleGroups);
  const groups = groupRoles(sorted);
  const allocatedCount = groups.find((g) => g.group === "Allocated")?.roles.length ?? 0;

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
              {hc.remaining > 0 ? `, ${hc.remaining} open` : ""}
              {group === "Open" && allocatedCount > 0
                ? `, ${allocatedCount} allocated (pending join)`
                : ""})
            </span>
          </h2>
          {view === "list" ? (
            <div className="space-y-2">
              {groupRolesList.map((role) => (
                <React.Fragment key={role.id}>
                  <RoleListItem
                    role={role}
                    count={activeCountByRoleId.get(role.id) ?? 0}
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
                    count={activeCountByRoleId.get(role.id) ?? 0}
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
