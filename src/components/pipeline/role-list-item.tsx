"use client";

import { ChevronDown } from "lucide-react";
import { OpenRole } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { daysOpen, headcountRemaining } from "@/lib/pipeline-helpers";

export function RoleListItem({
  role,
  count,
  selected,
  onSelect,
}: {
  role: OpenRole;
  count: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Card
      onClick={onSelect}
      className={cn(
        "cursor-pointer transition-all",
        role.segment === "IPS" ? "bg-ips-bg/50" : "bg-so-bg/50",
        selected && "ring-2 ring-penda-teal border-penda-teal/60"
      )}
    >
      <CardContent className="p-3 flex items-center gap-4">
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            selected && "rotate-180 text-penda-teal"
          )}
        />
        <p className="text-sm font-semibold flex-1 min-w-0 truncate">{role.title}</p>
        <p className="text-xs text-muted-foreground w-32 shrink-0 truncate">{role.location}</p>
        <p className="text-xs text-muted-foreground w-20 shrink-0 truncate hidden md:block">
          {role.employmentType ?? "—"}
        </p>
        <Badge variant={role.segment === "IPS" ? "ips" : "so"}>{role.segment}</Badge>
        <Badge
          variant={role.priority === "Critical" ? "critical" : role.priority === "High" ? "high" : "outline"}
        >
          {role.priority}
        </Badge>
        <span className="text-xs text-muted-foreground w-20 shrink-0 text-right hidden sm:inline">
          {headcountRemaining(role)}/{role.hcApproved} open
        </span>
        <span className="text-xs text-muted-foreground w-16 shrink-0 text-right hidden lg:inline">
          {daysOpen(role.datePosted)}d
        </span>
        <p className="text-xs text-muted-foreground w-40 shrink-0 truncate italic hidden xl:block">
          {role.notes ?? ""}
        </p>
        <span className="text-xs text-muted-foreground w-24 shrink-0 text-right">{count} in pipeline</span>
      </CardContent>
    </Card>
  );
}
