// Pure helpers for requisition approval workflows — safe on both client
// (the Settings editor) and server (src/lib/requisitions/approval.ts).
import { RequisitionApprovalStep, RequisitionApprovalWorkflow, RequisitionType, Segment } from "@/types";

/**
 * Starting rows for the Settings editor before a workflow has ever been
 * saved — the labels the IPS Gap / SO forms used to hard-code, minus the
 * approvers themselves, which only a Recruitment Manager can fill in.
 */
export const DEFAULT_STEP_LABELS: Record<Segment, { label: string; appliesTo?: RequisitionType[] }[]> = {
  IPS: [{ label: "Recruiter" }, { label: "TA Manager" }],
  SO: [
    { label: "Hiring Manager" },
    { label: "HOD" },
    { label: "HRBP", appliesTo: ["SO New Role"] },
    { label: "HR Ops", appliesTo: ["SO New Role"] },
    { label: "Director of People" },
  ],
};

export function newStepId(): string {
  return `step-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function defaultSteps(segment: Segment): RequisitionApprovalStep[] {
  return DEFAULT_STEP_LABELS[segment].map((s) => ({
    id: newStepId(),
    label: s.label,
    approverName: "",
    approverEmail: "",
    appliesTo: s.appliesTo,
  }));
}

/** The steps a given requisition type actually goes through, in order. */
export function stepsForType(
  workflow: RequisitionApprovalWorkflow | undefined | null,
  type: RequisitionType
): RequisitionApprovalStep[] {
  return (workflow?.steps ?? []).filter((s) => !s.appliesTo?.length || s.appliesTo.includes(type));
}

export function sameEmail(a: string | undefined | null, b: string | undefined | null): boolean {
  return !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
}

/** What request forms show about a workflow — who, not how to reach them. */
export type WorkflowPreviewStep = Pick<RequisitionApprovalStep, "label" | "approverName" | "appliesTo">;
export type WorkflowPreview = Record<Segment, WorkflowPreviewStep[]>;

export function toWorkflowPreview(workflows: Partial<Record<Segment, RequisitionApprovalWorkflow>> | null): WorkflowPreview {
  const strip = (workflow?: RequisitionApprovalWorkflow) =>
    (workflow?.steps ?? []).map(({ label, approverName, appliesTo }) => ({ label, approverName, appliesTo }));
  return { IPS: strip(workflows?.IPS), SO: strip(workflows?.SO) };
}
