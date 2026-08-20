import { Badge } from "@/components/ui/badge";
import { OpenRole } from "@/types";
import { fillType } from "@/lib/expansion-helpers";

export function FillTypeBadge({ role }: { role: OpenRole }) {
  const type = fillType(role);
  if (type === "Unfilled") return <Badge variant="outline">Unfilled</Badge>;
  if (type === "Internal") {
    return (
      <Badge variant="ips" title={role.internalFillName ? `Filled by ${role.internalFillName}` : undefined}>
        Internal{role.internalFillName ? ` — ${role.internalFillName}` : ""}
      </Badge>
    );
  }
  return <Badge variant="so">External Hire</Badge>;
}
