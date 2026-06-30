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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getRoleForCandidate } from "@/lib/pipeline-helpers";

export function CandidatesTable({
  candidates,
  openRoles,
  onViewProfile,
  onMoveStage,
  onScheduleInterview,
  onReject,
}: {
  candidates: Candidate[];
  openRoles: OpenRole[];
  onViewProfile: (candidate: Candidate) => void;
  onMoveStage: (candidate: Candidate) => void;
  onScheduleInterview: (candidate: Candidate) => void;
  onReject: (candidate: Candidate) => void;
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
          return (
            <TableRow
              key={candidate.id}
              onClick={() => onViewProfile(candidate)}
              className="cursor-pointer"
            >
              <TableCell>
                <p className="font-medium leading-tight">{candidate.name}</p>
                <p className="text-xs text-muted-foreground">{candidate.email}</p>
              </TableCell>
              <TableCell className="text-muted-foreground">{role?.title ?? "Unknown role"}</TableCell>
              <TableCell>
                {role && <Badge variant={role.segment === "IPS" ? "ips" : "so"}>{role.segment}</Badge>}
              </TableCell>
              <TableCell>
                <Badge variant="secondary">{candidate.stage}</Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{candidate.source}</TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(candidate.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onViewProfile(candidate)}>View Profile</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onMoveStage(candidate)}>Move Stage</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onScheduleInterview(candidate)}>
                      Schedule Interview
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onReject(candidate)}
                      className="text-destructive focus:text-destructive"
                    >
                      Reject
                    </DropdownMenuItem>
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
