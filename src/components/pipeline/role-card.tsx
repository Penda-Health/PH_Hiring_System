"use client";

import { OpenRole } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { daysOpen, headcountRemaining } from "@/lib/pipeline-helpers";

export function RoleCard({
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
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold leading-tight">{role.title}</p>
          <Badge variant={role.segment === "IPS" ? "ips" : "so"}>{role.segment}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">{role.location}</p>
        <p className="text-xs text-muted-foreground">
          {role.employmentType && <>{role.employmentType} · </>}
          {headcountRemaining(role)} of {role.hcApproved} open · {daysOpen(role.datePosted)}d open
        </p>
        {role.notes && <p className="text-xs text-muted-foreground truncate italic">{role.notes}</p>}
        <div className="flex items-center justify-between">
          <Badge
            variant={role.priority === "Critical" ? "critical" : role.priority === "High" ? "high" : "outline"}
          >
            {role.priority}
          </Badge>
          <span className="text-xs text-muted-foreground">{count} in pipeline</span>
        </div>
      </CardContent>
    </Card>
  );
}
