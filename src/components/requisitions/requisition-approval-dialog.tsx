"use client";

// Opened from a requisition row: shows every approval step with its outcome
// so far, and — when the signed-in user is the current step's approver (or
// a Recruitment Manager overriding) — lets them approve or reject with a
// comment. The server re-checks all of this; the UI only decides what to offer.
import * as React from "react";
import { Check, Clock, X } from "lucide-react";
import { Requisition } from "@/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type ApprovalMode = "approver" | "override" | "view";

const DECISION_ERRORS: Record<string, string> = {
  not_approver: "Only the approver named on this step can act on it.",
  stale_step: "This step was already decided — refresh to see where the request is now.",
  not_pending: "This request is no longer pending approval.",
  comment_required: "Add a reason for rejecting.",
};

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" });
}

export function RequisitionApprovalDialog({
  requisition,
  mode,
  open,
  onOpenChange,
  onDecide,
}: {
  requisition: Requisition;
  mode: ApprovalMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDecide: (decision: "Approved" | "Rejected", comment: string) => Promise<{ ok: true } | { ok: false; error: string }>;
}) {
  const [comment, setComment] = React.useState("");
  const [submitting, setSubmitting] = React.useState<"Approved" | "Rejected" | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setComment("");
      setError(null);
    }
  }, [open]);

  const steps = requisition.approvalSteps ?? [];
  const log = requisition.approvalLog ?? [];
  const pending = requisition.status === "Pending Approval";

  async function decide(decision: "Approved" | "Rejected") {
    if (decision === "Rejected" && !comment.trim()) {
      setError(DECISION_ERRORS.comment_required);
      return;
    }
    setSubmitting(decision);
    setError(null);
    const result = await onDecide(decision, comment.trim());
    setSubmitting(null);
    if (result.ok) onOpenChange(false);
    else setError(DECISION_ERRORS[result.error] ?? "Something went wrong. Please try again.");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {requisition.reqId} · {requisition.roleTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Requested by {requisition.submitterName || requisition.submittedBy}
            {requisition.submitterEmail ? ` (${requisition.submitterEmail})` : ""} · {requisition.type} ·{" "}
            {requisition.headcount} headcount
          </p>

          {steps.length === 0 ? (
            <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
              No approval workflow was configured for {requisition.segment} when this was submitted.
              {pending ? " A Recruitment Manager can approve it directly." : ""}
            </p>
          ) : (
            <ol className="space-y-2">
              {steps.map((step, i) => {
                const entry = [...log].reverse().find((e) => e.stepIndex === i);
                const isCurrent = pending && i === requisition.currentApproverIndex;
                return (
                  <li key={step.id ?? i} className="flex gap-3 rounded-md border p-2.5">
                    <span className="mt-0.5 shrink-0">
                      {entry?.decision === "Approved" ? (
                        <Check className="h-4 w-4 text-emerald-600" />
                      ) : entry?.decision === "Rejected" ? (
                        <X className="h-4 w-4 text-destructive" />
                      ) : (
                        <Clock className={`h-4 w-4 ${isCurrent ? "text-amber-600" : "text-muted-foreground/40"}`} />
                      )}
                    </span>
                    <div className="min-w-0 flex-1 text-sm">
                      <p className="font-medium leading-tight">
                        {i + 1}. {step.label}
                        {isCurrent && <span className="ml-2 text-xs font-normal text-amber-700">Waiting</span>}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {step.approverName} · {step.approverEmail}
                      </p>
                      {entry && (
                        <p className="mt-1 text-xs">
                          {entry.decision} {formatWhen(entry.decidedAt)}
                          {entry.via === "override" ? ` — override by ${entry.decidedBy}` : ""}
                          {entry.comment ? ` — “${entry.comment}”` : ""}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          {/* A no-workflow request decided by override has a log entry with no matching step. */}
          {steps.length === 0 &&
            log.map((entry, i) => (
              <p key={i} className="text-xs">
                {entry.decision} by {entry.decidedBy} · {formatWhen(entry.decidedAt)}
                {entry.comment ? ` — “${entry.comment}”` : ""}
              </p>
            ))}

          {pending && mode !== "view" && (
            <div className="space-y-1.5">
              {mode === "override" && (
                <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-800">
                  You&apos;re not the approver for this step. Acting as a Recruitment Manager override — it&apos;s logged
                  and shown in Google Chat as an override.
                </p>
              )}
              <Label htmlFor="approval-comment">Comment (required to reject)</Label>
              <Textarea
                id="approval-comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                maxLength={1000}
              />
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        {pending && mode !== "view" && (
          <DialogFooter>
            <Button variant="outline" disabled={!!submitting} onClick={() => decide("Rejected")}>
              {submitting === "Rejected" ? "Rejecting…" : "Reject"}
            </Button>
            <Button
              disabled={!!submitting}
              onClick={() => decide("Approved")}
              className="bg-penda-blue hover:bg-penda-blue-dark"
            >
              {submitting === "Approved" ? "Approving…" : mode === "override" ? "Approve (override)" : "Approve"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
