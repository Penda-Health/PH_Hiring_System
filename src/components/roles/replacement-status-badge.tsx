import { Badge } from "@/components/ui/badge";
import { OpenRole, Requisition } from "@/types";
import { resolveReplacementStatus } from "@/lib/expansion-helpers";

const STYLES: Record<NonNullable<ReturnType<typeof resolveReplacementStatus>>, "critical" | "high" | "success" | "outline"> = {
  "Needs Replacement": "critical",
  "Pending Approval": "high",
  Approved: "high",
  Rejected: "critical",
  "In Pipeline": "outline",
  Backfilled: "success",
};

/** Renders nothing for roles that aren't internal fills — replacement tracking doesn't apply to them. */
export function ReplacementStatusBadge({
  role,
  requisitions,
  openRoles,
}: {
  role: OpenRole;
  requisitions: Requisition[];
  openRoles: OpenRole[];
}) {
  const status = resolveReplacementStatus(role, requisitions, openRoles);
  if (!status) return <span className="text-muted-foreground">—</span>;
  return <Badge variant={STYLES[status]}>{status}</Badge>;
}
