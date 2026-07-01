"use client";

import { MoreHorizontal } from "lucide-react";
import { Candidate, OpenRole } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getRoleForCandidate } from "@/lib/pipeline-helpers";

function safeDate(iso: string | undefined | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

export function CandidatesTable({
  candidates,
  openRoles,
  canEdit,
  onViewProfile,
  onEdit,
  onMoveStage,
  onScheduleInterview,
  onReject,
  onDelete,
}: {
  candidates: Candidate[];
  openRoles: OpenRole[];
  canEdit: boolean;
  onViewProfile: (candidate: Candidate) => void;
  onEdit: (candidate: Candidate) => void;
  onMoveStage: (candidate: Candidate) => void;
  onScheduleInterview: (candidate: Candidate) => void;
  onReject: (candidate: Candidate) => void;
  onDelete: (candidate: Candidate) => void;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Candidate</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Segment</TableHead>
          <TableHead>Stage</TableHead>
          <TableHead>Source</TableHead>
          <TableHead>Applied</TableHead>
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {candidates.map((candidate) => {
          const role = getRoleForCandidate(candidate, openRoles);
          const displayName = candidate.name || "(no name)";
          return (
            <TableRow
              key={candidate.id}
              onClick={() => onViewProfile(candidate)}
              className="cursor-pointer"
            >
              <TableCell>
                <p className="font-medium leading-tight">{displayName}</p>
                {candidate.email && (
                  <p className="text-xs text-muted-foreground">{candidate.email}</p>
                )}
              </TableCell>
              <TableCell className={role ? "text-muted-foreground" : "text-muted-foreground/50 italic"}>
                {role?.title ?? "Unknown role"}
              </TableCell>
              <TableCell>
                {role && <Badge variant={role.segment === "IPS" ? "ips" : "so"}>{role.segment}</Badge>}
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{candidate.stage}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{candidate.source || "—"}</TableCell>
              <TableCell className="text-muted-foreground">{safeDate(candidate.createdAt)}</TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onViewProfile(candidate)}>View Profile</DropdownMenuItem>
                    {canEdit && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => onEdit(candidate)}>Edit Candidate</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onMoveStage(candidate)}>Move Stage</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onScheduleInterview(candidate)}>
                          Schedule Interview
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onReject(candidate)}
                          className="text-destructive focus:text-destructive"
                        >
                          Reject
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDelete(candidate)}
                          className="text-destructive focus:text-destructive"
                        >
                          Delete
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
        {candidates.length === 0 && (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
              No candidates match these filters
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
