"use client";

import * as React from "react";
import { Branch, Requisition, User } from "@/types";
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
import { ApprovalMode, RequisitionApprovalDialog } from "./requisition-approval-dialog";
import { branchName } from "@/lib/requisitions-helpers";
import { sameEmail } from "@/lib/requisitions/workflow";

function approvalSummary(req: Requisition): string {
  const steps = req.approvalSteps ?? [];
  if (req.status === "Pending Approval") {
    const step = steps[req.currentApproverIndex];
    if (!step) return steps.length === 0 ? "No workflow set" : "—";
    return `${req.currentApproverIndex + 1}/${steps.length} · ${step.label} — ${step.approverName}`;
  }
  if (req.status === "Rejected") {
    const entry = [...(req.approvalLog ?? [])].reverse().find((e) => e.decision === "Rejected");
    return entry ? `Rejected at ${entry.label}` : "—";
  }
  // Older requisitions predate the configurable workflow and only have labels.
  return steps.length ? `All ${steps.length} approved` : req.approverChain.join(" → ") || "—";
}

export function RequisitionTable({
  requisitions,
  branches,
  user,
  canEdit,
  onDecide,
  onResend,
}: {
  requisitions: Requisition[];
  branches: Branch[];
  user: User | null;
  canEdit: boolean;
  onDecide: (
    id: string,
    decision: "Approved" | "Rejected",
    opts: { stepIndex: number; comment?: string; override?: boolean }
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  onResend: (id: string) => Promise<boolean>;
}) {
  const [active, setActive] = React.useState<{ id: string; mode: ApprovalMode } | null>(null);
  const [resending, setResending] = React.useState<string | null>(null);
  const [resent, setResent] = React.useState<string | null>(null);
  const activeReq = active ? requisitions.find((r) => r.id === active.id) : undefined;

  function modeFor(req: Requisition): ApprovalMode {
    if (req.status !== "Pending Approval") return "view";
    if (sameEmail(req.currentApproverEmail, user?.email)) return "approver";
    if (user?.role === "recruitment_manager") return "override";
    return "view";
  }

  async function resend(id: string) {
    setResending(id);
    const ok = await onResend(id);
    setResending(null);
    setResent(ok ? id : null);
  }

  return (
    <>
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
            <TableHead>Approval</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requisitions.map((req) => {
            const mode = modeFor(req);
            const canResend = canEdit && req.status === "Pending Approval" && !!req.currentApproverEmail;
            return (
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
                <TableCell className="text-muted-foreground">{req.submitterName || req.submittedBy}</TableCell>
                <TableCell className="max-w-56 truncate text-muted-foreground" title={approvalSummary(req)}>
                  {approvalSummary(req)}
                </TableCell>
                <TableCell>
                  <RequisitionStatusBadge status={req.status} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {mode === "approver" ? (
                      <Button size="sm" onClick={() => setActive({ id: req.id, mode })} className="bg-penda-blue hover:bg-penda-blue-dark">
                        Review
                      </Button>
                    ) : mode === "override" ? (
                      <Button size="sm" variant="outline" onClick={() => setActive({ id: req.id, mode })}>
                        Review
                      </Button>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => setActive({ id: req.id, mode })}>
                        History
                      </Button>
                    )}
                    {canResend && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={resending === req.id}
                        onClick={() => resend(req.id)}
                        title={`Re-send the approval email to ${req.currentApproverEmail}`}
                      >
                        {resending === req.id ? "Sending…" : resent === req.id ? "Sent" : "Resend email"}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {requisitions.length === 0 && (
            <TableRow>
              <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                No requisitions match these filters
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {activeReq && active && (
        <RequisitionApprovalDialog
          requisition={activeReq}
          mode={active.mode}
          open
          onOpenChange={(open) => !open && setActive(null)}
          onDecide={(decision, comment) =>
            onDecide(activeReq.id, decision, {
              stepIndex: activeReq.currentApproverIndex,
              comment: comment || undefined,
              override: active.mode === "override",
            })
          }
        />
      )}
    </>
  );
}
