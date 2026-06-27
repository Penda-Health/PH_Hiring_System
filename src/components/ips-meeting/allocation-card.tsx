"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Branch, Candidate, OpenRole, Priority } from "@/types";
import { IpsAllocation } from "@/lib/supabase/ips-meetings";
import { getSelectableIpsCandidates } from "@/lib/ips-role-groups";

const PRIORITY_BADGE_VARIANT: Record<Priority, "critical" | "high" | "so" | "secondary"> = {
  Critical: "critical",
  High: "high",
  Medium: "so",
  Low: "secondary",
};

export function AllocationCard({
  allocation,
  role,
  branch,
  candidates,
  openRoles,
  canEdit,
  onCandidateChange,
  onNoteChange,
}: {
  allocation: IpsAllocation;
  role: OpenRole | undefined;
  branch: Branch | undefined;
  candidates: Candidate[];
  openRoles: OpenRole[];
  canEdit: boolean;
  onCandidateChange: (candidateId: string | null) => void;
  onNoteChange: (note: string) => void;
}) {
  const [note, setNote] = React.useState(allocation.note ?? "");
  React.useEffect(() => setNote(allocation.note ?? ""), [allocation.note]);

  const selectable = getSelectableIpsCandidates(candidates, openRoles, allocation.openRoleId);
  const candidateById = new Map(candidates.map((c) => [c.id, c]));
  const assigned = allocation.candidateId ? candidateById.get(allocation.candidateId) : undefined;

  return (
    <Card className={cn(!allocation.candidateId && allocation.priority === "Critical" && "border-critical-fg/40")}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium leading-tight truncate">{role?.title ?? allocation.openRoleId}</p>
            <p className="text-xs text-muted-foreground truncate">{branch?.name ?? allocation.branchId}</p>
          </div>
          <Badge variant={PRIORITY_BADGE_VARIANT[allocation.priority as Priority] ?? "secondary"} className="shrink-0">
            {allocation.priority}
          </Badge>
        </div>

        <Select
          value={allocation.candidateId ?? "__unfilled__"}
          onValueChange={(v) => onCandidateChange(v === "__unfilled__" ? null : v)}
          disabled={!canEdit}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Unfilled" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__unfilled__">Unfilled</SelectItem>
            {assigned && !selectable.some((c) => c.id === assigned.id) && (
              <SelectItem value={assigned.id}>{assigned.name} (current)</SelectItem>
            )}
            {selectable.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Textarea
          placeholder="Notes for this slot…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onBlur={() => {
            if (note !== (allocation.note ?? "")) onNoteChange(note);
          }}
          disabled={!canEdit}
          className="text-sm min-h-16"
        />
      </CardContent>
    </Card>
  );
}
