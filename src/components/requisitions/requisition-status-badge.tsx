import { Badge } from "@/components/ui/badge";
import { RequisitionStatus } from "@/types";

const STATUS_STYLES: Record<RequisitionStatus, string> = {
  "Pending Approval": "bg-high-bg text-high-fg border-transparent",
  Approved: "bg-penda-teal-light text-penda-teal-dark border-transparent",
  Rejected: "bg-critical-bg text-critical-fg border-transparent",
  "Converted to Open Role": "bg-muted text-muted-foreground border-transparent",
};

export function RequisitionStatusBadge({ status }: { status: RequisitionStatus }) {
  return <Badge className={STATUS_STYLES[status]}>{status}</Badge>;
}
