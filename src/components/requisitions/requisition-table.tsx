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
import { RoleStatusBadge } from "@/components/roles/role-status-badge";
import { ApprovalMode, RequisitionApprovalDialog } from "./requisition-approval-dialog";
import { branchName } from "@/lib/requisitions-helpers";
import { formatSubmitted, RequisitionRow } from "@/lib/requisitions/list-view";
import { cn } from "@/lib/utils";

const STAGE_BADGE: Record<RequisitionRow["stage"], { label: string; className: string }> = {
  pending: { label: "Pending approval", className: "bg-high-bg text-high-fg border-transparent" },
  hiring: { label: "Approved", className: "bg-penda-blue-light text-penda-blue-dark border-transparent" },
  closed: { label: "Closed", className: "bg-muted text-muted-foreground border-transparent" },
};

/** One plain-language line under the status: what this requisition is waiting on. */
function progressLine(row: RequisitionRow): string {
  const { req, role } = row;
  const steps = req.approvalSteps ?? [];
  if (req.status === "Pending Approval") {
    const step = steps[req.currentApproverIndex];
    if (!step) return steps.length === 0 ? "No approval workflow set" : "";
    const who = step.approverName || (step.approverEmail ? step.approverEmail : "no approver on file");
    return `Step ${req.currentApproverIndex + 1} of ${steps.length}: waiting on ${who} (${step.label})`;
  }
  if (req.status === "Rejected") {
    const entry = [...(req.approvalLog ?? [])].reverse().find((e) => e.decision === "Rejected");
    return entry ? `Rejected by ${steps[entry.stepIndex]?.approverName || entry.label}` : "Rejected";
  }
  if (role) {
    const filled = `${role.hcFilled}/${role.hcApproved} filled`;
    return role.status === "Cancelled" ? "Role cancelled" : `${role.roleId} · ${filled}`;
  }
  return steps.length ? `Approved by all ${steps.length} approvers` : "Approved";
}

function StepDots({ req }: { req: Requisition }) {
  const steps = req.approvalSteps ?? [];
  if (steps.length < 2) return null;
  const rejected = req.status === "Rejected";
  const done = req.status === "Pending Approval" || rejected ? req.currentApproverIndex : steps.length;
  return (
    <div className="flex items-center gap-1" aria-hidden>
      {steps.map((s, i) => (
        <span
          key={i}
          title={s.label}
          className={cn(
            "h-1.5 w-4 rounded-full",
            i < done
              ? "bg-penda-blue"
              : i === done && rejected
                ? "bg-critical-fg"
                : i === done && req.status === "Pending Approval"
                  ? "bg-high-fg"
                  : "bg-muted"
          )}
        />
      ))}
    </div>
  );
}

export function RequisitionTable({
  rows,
  branches,
  user,
  canEdit,
  onDecide,
  onResend,
  emptyMessage,
}: {
  rows: RequisitionRow[];
  branches: Branch[];
  user: User | null;
  canEdit: boolean;
  onDecide: (
    id: string,
    decision: "Approved" | "Rejected",
    opts: { stepIndex: number; comment?: string; override?: boolean }
  ) => Promise<{ ok: true } | { ok: false; error: string }>;
  onResend: (id: string) => Promise<boolean>;
  emptyMessage: string;
}) {
  const [active, setActive] = React.useState<{ id: string; mode: ApprovalMode } | null>(null);
  const [resending, setResending] = React.useState<string | null>(null);
  const [resent, setResent] = React.useState<{ id: string; ok: boolean } | null>(null);
  const activeReq = active ? rows.find((r) => r.req.id === active.id)?.req : undefined;

  function modeFor(row: RequisitionRow): ApprovalMode {
    if (row.req.status !== "Pending Approval") return "view";
    if (row.waitingOnMe) return "approver";
    if (user?.role === "recruitment_manager") return "override";
    return "view";
  }

  async function resend(id: string) {
    setResending(id);
    const ok = await onResend(id);
    setResending(null);
    setResent({ id, ok });
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Requisition</TableHead>
            <TableHead>Where</TableHead>
            <TableHead>Urgency</TableHead>
            <TableHead>Requested</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const { req, role, stage } = row;
            const mode = modeFor(row);
            // Also offered when the current RM/BM step has no account on file —
            // resending re-resolves it, so it works once Settings is fixed.
            const canResend = canEdit && req.status === "Pending Approval" && !!req.approvalSteps?.length;
            const badge =
              stage === "closed" && req.status === "Rejected"
                ? { label: "Rejected", className: "bg-critical-bg text-critical-fg border-transparent" }
                : STAGE_BADGE[stage];
            const where = req.branchId ? branchName(req.branchId, branches) : req.department;
            return (
              <TableRow key={req.id} className={cn(row.waitingOnMe && "bg-penda-blue-light/40", stage === "closed" && "opacity-75")}>
                <TableCell className="align-top">
                  <div className="font-medium leading-snug">
                    {req.roleTitle}
                    {req.headcount > 1 && <span className="text-muted-foreground font-normal"> × {req.headcount}</span>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {req.reqId} · {req.gapReason ?? req.type}
                  </div>
                </TableCell>
                <TableCell className="align-top">
                  <div className="flex items-center gap-2">
                    <Badge variant={req.segment === "IPS" ? "ips" : "so"}>{req.segment}</Badge>
                    <span className="text-sm">{where || "—"}</span>
                  </div>
                  {req.branchId && req.department && (
                    <div className="text-xs text-muted-foreground mt-0.5">{req.department}</div>
                  )}
                </TableCell>
                <TableCell className="align-top">
                  <Badge variant={req.urgency === "Critical" ? "critical" : req.urgency === "High" ? "high" : "outline"}>
                    {req.urgency}
                  </Badge>
                </TableCell>
                <TableCell className="align-top">
                  <div className="text-sm">{req.submitterName || req.submittedBy}</div>
                  <div className="text-xs text-muted-foreground">{formatSubmitted(req.submittedAt)}</div>
                </TableCell>
                <TableCell className="align-top max-w-80">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={badge.className}>{badge.label}</Badge>
                    {role && req.status !== "Pending Approval" && <RoleStatusBadge status={role.status} />}
                    {row.waitingOnMe && <Badge className="bg-penda-blue text-white border-transparent">Your turn</Badge>}
                  </div>
                  <div className="mt-1.5 space-y-1">
                    <StepDots req={req} />
                    <div className="text-xs text-muted-foreground">{progressLine(row)}</div>
                  </div>
                </TableCell>
                <TableCell className="align-top">
                  <div className="flex items-center justify-end gap-2">
                    {canResend && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={resending === req.id}
                        onClick={() => resend(req.id)}
                        title={
                          req.currentApproverEmail
                            ? `Re-send the approval email to ${req.currentApproverEmail}`
                            : "Look the approver up again and send the email"
                        }
                      >
                        {resending === req.id
                          ? "Sending…"
                          : resent?.id === req.id
                            ? resent.ok
                              ? "Sent"
                              : "No account on file"
                            : "Resend email"}
                      </Button>
                    )}
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
                        Details
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
          {rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                {emptyMessage}
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
