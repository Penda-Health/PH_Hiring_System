import { Badge } from "@/components/ui/badge";
import { RoleStatus } from "@/types";

const STATUS_STYLES: Record<RoleStatus, string> = {
  Open: "bg-penda-teal-light text-penda-teal-dark border-transparent",
  Allocated: "bg-blue-100 text-blue-700 border-transparent",
  Filled: "bg-muted text-muted-foreground border-transparent",
  "On Hold": "bg-high-bg text-high-fg border-transparent",
  Cancelled: "bg-critical-bg text-critical-fg border-transparent",
};

export function RoleStatusBadge({ status }: { status: RoleStatus }) {
  return <Badge className={STATUS_STYLES[status]}>{status}</Badge>;
}
