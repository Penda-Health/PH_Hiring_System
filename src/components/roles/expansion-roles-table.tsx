import * as React from "react";
import { Candidate, OpenRole, Requisition } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RoleStatusBadge } from "./role-status-badge";
import { FillTypeBadge } from "./fill-type-badge";
import { ReplacementStatusBadge } from "./replacement-status-badge";
import { headcountPct, ACTIVE_CANDIDATE_STAGE_EXCLUSIONS } from "@/lib/roles-helpers";
import { headcountRemaining } from "@/lib/pipeline-helpers";

export function ExpansionRolesTable({
  roles,
  candidates,
  requisitions,
  openRoles,
  onSelectRole,
}: {
  roles: OpenRole[];
  candidates: Candidate[];
  requisitions: Requisition[];
  openRoles: OpenRole[];
  onSelectRole: (role: OpenRole) => void;
}) {
  const activeCountByRoleId = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of candidates) {
      if (!c.roleId || ACTIVE_CANDIDATE_STAGE_EXCLUSIONS.has(c.stage)) continue;
      counts.set(c.roleId, (counts.get(c.roleId) ?? 0) + 1);
    }
    return counts;
  }, [candidates]);

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Role</TableHead>
          <TableHead>Branch</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Headcount</TableHead>
          <TableHead>Fill Type</TableHead>
          <TableHead>Replacement</TableHead>
          <TableHead>In Pipeline</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {roles.map((role) => (
          <TableRow key={role.id} onClick={() => onSelectRole(role)} className="cursor-pointer">
            <TableCell className="font-medium">{role.title}</TableCell>
            <TableCell className="text-muted-foreground">{role.location}</TableCell>
            <TableCell>
              <Badge variant={role.priority === "Critical" ? "critical" : role.priority === "High" ? "high" : "outline"}>
                {role.priority}
              </Badge>
            </TableCell>
            <TableCell>
              <RoleStatusBadge status={role.status} />
            </TableCell>
            <TableCell className="w-40">
              <div className="flex items-center gap-2">
                <Progress value={headcountPct(role)} className="h-2 w-20" />
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {role.hcFilled}/{role.hcApproved}
                </span>
                {headcountRemaining(role) > 0 && (
                  <span className="text-xs font-medium text-penda-blue whitespace-nowrap">
                    ({headcountRemaining(role)} open)
                  </span>
                )}
              </div>
            </TableCell>
            <TableCell>
              <FillTypeBadge role={role} />
            </TableCell>
            <TableCell>
              <ReplacementStatusBadge role={role} requisitions={requisitions} openRoles={openRoles} />
            </TableCell>
            <TableCell>{activeCountByRoleId.get(role.id) ?? 0}</TableCell>
          </TableRow>
        ))}
        {roles.length === 0 && (
          <TableRow>
            <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
              No expansion roles match these filters
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
