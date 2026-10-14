"use client";

// "Who will approve this" strip on the request forms, driven by the live
// workflow from Settings → Requisition approvals rather than a hard-coded list.
import * as React from "react";
import { RequisitionType } from "@/types";
import { Badge } from "@/components/ui/badge";
import { WorkflowPreviewStep } from "@/lib/requisitions/workflow";

/** Who a step means, as far as the form can tell before submitting. */
function stepWho(step: WorkflowPreviewStep, branch?: { regionalManager?: string; branchManager?: string }): string {
  if (step.approverType === "regional_manager") return branch?.regionalManager || "the branch's RM";
  if (step.approverType === "branch_manager") return branch?.branchManager || "the branch's BM";
  return step.approverName;
}

export function ApprovalChainPreview({
  steps,
  type,
  branch,
}: {
  steps: WorkflowPreviewStep[] | null;
  type: RequisitionType;
  /** The branch picked on the form, so RM/BM steps can show the actual person. */
  branch?: { regionalManager?: string; branchManager?: string };
}) {
  if (steps === null) return <p className="text-sm text-muted-foreground">Loading approvers…</p>;
  const applicable = steps.filter((s) => !s.appliesTo?.length || s.appliesTo.includes(type));
  if (applicable.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No approvers are set up for this request type yet — it will wait for the recruitment team to approve it.
      </p>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      {applicable.map((step, i) => (
        <React.Fragment key={`${step.label}-${i}`}>
          <Badge variant="outline" className="font-normal">
            <span className="font-medium">{step.label}</span>
            {stepWho(step, branch) ? <span className="ml-1 text-muted-foreground">· {stepWho(step, branch)}</span> : null}
          </Badge>
          {i < applicable.length - 1 && <span className="text-muted-foreground">→</span>}
        </React.Fragment>
      ))}
    </div>
  );
}

/** Fetches the signed-in preview once; `null` while loading (and on failure, which just keeps the loading copy). */
export function useWorkflowPreview(): Record<"IPS" | "SO", WorkflowPreviewStep[]> | null {
  const [preview, setPreview] = React.useState<Record<"IPS" | "SO", WorkflowPreviewStep[]> | null>(null);
  React.useEffect(() => {
    fetch("/api/requisitions/workflows")
      .then((res) => (res.ok ? res.json() : null))
      .then((body) => body && setPreview(body))
      .catch(() => {});
  }, []);
  return preview;
}
