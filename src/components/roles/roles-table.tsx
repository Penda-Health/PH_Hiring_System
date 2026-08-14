import * as React from "react";
import { Candidate, OpenRole } from "@/types";
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
import { headcountPct, ACTIVE_CANDIDATE_STAGE_EXCLUSIONS } from "@/lib/roles-helpers";
import { headcountRemaining } from "@/lib/pipeline-helpers";

export function RolesTable({
  roles,
  candidates,
  onSelectRole,
}: {
  roles: OpenRole[];
  candidates: Candidate[];
  onSelectRole: (role: OpenRole) => void;
}) {
  // activeCandidateCount() filters the whole candidates array per role — for
  // a table with N roles that's O(N * candidates) every render. Build the
  // per-role counts once in O(roles + candidates) instead.
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
          <TableHead>Segment</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Headcount</TableHead>
          <TableHead>In Pipeline</TableHead>
          <TableHead>Location</TableHead>
          <TableHead>Recruiter</TableHead>
          <TableHead>Posted</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {roles.map((role) => (
          <TableRow
            key={role.id}
            onClick={() => onSelectRole(role)}
            className="cursor-pointer"
          >
            <TableCell className="font-medium">{role.title}</TableCell>
            <TableCell>
              <Badge variant={role.segment === "IPS" ? "ips" : "so"}>{role.segment}</Badge>
            </TableCell>
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
                {/* Gap isn't visible from the fraction alone — e.g. 1/1.5 easily
                    reads as "filled" at a glance, so call out the remainder
                    explicitly (0.5s from clustered-branch roles included). */}
                {headcountRemaining(role) > 0 && (
                  <span className="text-xs font-medium text-penda-blue whitespace-nowrap">
                    ({headcountRemaining(role)} open)
                  </span>
                )}
              </div>
            </TableCell>
            <TableCell>{activeCountByRoleId.get(role.id) ?? 0}</TableCell>
            <TableCell className="text-muted-foreground">{role.location}</TableCell>
            <TableCell className="text-muted-foreground">{role.recruiter}</TableCell>
            <TableCell className="text-muted-foreground">
              {new Date(role.datePosted).toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}
            </TableCell>
          </TableRow>
        ))}
        {roles.length === 0 && (
          <TableRow>
            <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
              No roles match these filters
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
