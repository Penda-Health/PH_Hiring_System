import { Branch, Requisition } from "@/types";
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
import { RequisitionStatusBadge } from "./requisition-status-badge";
import { branchName } from "@/lib/requisitions-helpers";

export function RequisitionTable({
  requisitions,
  branches,
  onApprove,
  onReject,
  canEdit,
}: {
  requisitions: Requisition[];
  branches: Branch[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  canEdit: boolean;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Req ID</TableHead>
          <TableHead>Role</TableHead>
          <TableHead>Segment</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Urgency</TableHead>
          <TableHead>Branch</TableHead>
          <TableHead>Submitted By</TableHead>
          <TableHead>Approver</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requisitions.map((req) => (
          <TableRow key={req.id}>
            <TableCell className="font-medium">{req.reqId}</TableCell>
            <TableCell>{req.roleTitle}</TableCell>
            <TableCell>
              <Badge variant={req.segment === "IPS" ? "ips" : "so"}>{req.segment}</Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">{req.type}</TableCell>
            <TableCell>
              <Badge variant={req.urgency === "Critical" ? "critical" : req.urgency === "High" ? "high" : "outline"}>
                {req.urgency}
              </Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">{branchName(req.branchId, branches)}</TableCell>
            <TableCell className="text-muted-foreground">{req.submittedBy}</TableCell>
            <TableCell className="text-muted-foreground">
              {req.approverChain[req.currentApproverIndex] ?? "—"}
            </TableCell>
            <TableCell>
              <RequisitionStatusBadge status={req.status} />
            </TableCell>
            <TableCell>
              {req.status === "Pending Approval" && canEdit ? (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => onApprove(req.id)}>
                    Approve
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onReject(req.id)}>
                    Reject
                  </Button>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </TableCell>
          </TableRow>
        ))}
        {requisitions.length === 0 && (
          <TableRow>
            <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
              No requisitions match these filters
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
