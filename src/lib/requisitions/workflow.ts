// Pure helpers for requisition approval workflows — safe on both client
// (the Settings editor) and server (src/lib/requisitions/approval.ts).
import {
  ApprovalStepApproverType,
  Branch,
  RegionalManagerContact,
  RequisitionApprovalStep,
  RequisitionApprovalWorkflow,
  RequisitionType,
  Segment,
} from "@/types";

/**
 * Starting rows for the Settings editor before a workflow has ever been
 * saved. IPS: the branch's Regional Manager, then the Deputy Head of IPS for
 * final sign-off. SO: the labels the SO form used to hard-code. The actual
 * people are left for a Recruitment Manager to fill in.
 */
export const DEFAULT_STEP_LABELS: Record<
  Segment,
  { label: string; approverType?: ApprovalStepApproverType; appliesTo?: RequisitionType[] }[]
> = {
  IPS: [{ label: "Regional Manager", approverType: "regional_manager" }, { label: "Deputy Head of IPS" }],
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
    approverType: s.approverType ?? "person",
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
export type WorkflowPreviewStep = Pick<RequisitionApprovalStep, "label" | "approverName" | "appliesTo" | "approverType">;
export type WorkflowPreview = Record<Segment, WorkflowPreviewStep[]>;

export function toWorkflowPreview(workflows: Partial<Record<Segment, RequisitionApprovalWorkflow>> | null): WorkflowPreview {
  const strip = (workflow?: RequisitionApprovalWorkflow) =>
    (workflow?.steps ?? []).map(({ label, approverName, appliesTo, approverType }) => ({ label, approverName, appliesTo, approverType }));
  return { IPS: strip(workflows?.IPS), SO: strip(workflows?.SO) };
}

export const APPROVER_TYPE_LABELS: Record<ApprovalStepApproverType, string> = {
  person: "Specific person",
  regional_manager: "Branch's Regional Manager",
  branch_manager: "Branch Manager",
};

export function approverTypeOf(step: Pick<RequisitionApprovalStep, "approverType">): ApprovalStepApproverType {
  return step.approverType ?? "person";
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Finds the directory entry for a branch's Regional Manager name. Exact
 * (case/space-insensitive) match first; failing that, a *unique* entry where
 * one name is the other plus more words — Branches sometimes hold just
 * "Ndegwa" for "Ndegwa Gathuri". Ambiguous partial matches resolve to nothing
 * rather than guessing the wrong approver.
 */
export function findRegionalManager(
  name: string | undefined,
  directory: RegionalManagerContact[] | undefined
): RegionalManagerContact | undefined {
  if (!name?.trim() || !directory?.length) return undefined;
  const target = normalizeName(name);
  const exact = directory.find((rm) => normalizeName(rm.name) === target);
  if (exact) return exact;
  const partial = directory.filter((rm) => {
    const candidate = normalizeName(rm.name);
    return candidate.startsWith(`${target} `) || target.startsWith(`${candidate} `);
  });
  return partial.length === 1 ? partial[0] : undefined;
}

/**
 * Fills in who a branch-based step means for a request on `branch`. "person"
 * steps pass through unchanged. An unresolvable step comes back with a blank
 * email (and the best name we have) so the caller can flag it.
 */
export function resolveStep(
  step: RequisitionApprovalStep,
  branch: Branch | undefined,
  directory: RegionalManagerContact[] | undefined
): RequisitionApprovalStep {
  const type = approverTypeOf(step);
  if (type === "person") return step;
  if (type === "branch_manager") {
    return { ...step, approverName: branch?.branchManager ?? "", approverEmail: branch?.bmEmail?.trim().toLowerCase() ?? "" };
  }
  const rmName = branch?.regionalManager ?? "";
  const contact = findRegionalManager(rmName, directory);
  return {
    ...step,
    approverName: contact?.name ?? rmName,
    approverEmail: contact?.email.trim().toLowerCase() ?? "",
  };
}

/** Distinct Regional Manager names across active branches — seeds Settings → Regional managers. */
export function regionalManagerNames(branches: Branch[]): string[] {
  const names = branches.filter((b) => b.active && b.regionalManager?.trim()).map((b) => b.regionalManager.trim());
  return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
}
