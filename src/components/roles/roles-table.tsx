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
import { headcountPct, activeCandidateCount } from "@/lib/roles-helpers";

export function RolesTable({
  roles,
  candidates,
  onSelectRole,
}: {
  roles: OpenRole[];
  candidates: Candidate[];
  onSelectRole: (role: OpenRole) => void;
}) {
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
            <TableCell className="w-36">
              <div className="flex items-center gap-2">
                <Progress value={headcountPct(role)} className="h-2 w-20" />
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {role.hcFilled}/{role.hcApproved}
                </span>
              </div>
            </TableCell>
            <TableCell>{activeCandidateCount(role, candidates)}</TableCell>
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
