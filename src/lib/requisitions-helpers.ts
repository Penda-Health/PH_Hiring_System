import { Branch, EmploymentType, OpenRole, Requisition } from "@/types";

// Part-time, locum and reliever staff float between clinics, so a request for
// one doesn't have to name a branch. Raised in-app (by the recruitment team)
// they also skip approval and become an Open Role straight away; raised from a
// public link they still go through the normal approvers.
export const FLOATING_EMPLOYMENT_TYPES: EmploymentType[] = ["Part-time", "Locum", "Reliever"];

export function isFloatingEmploymentType(type: EmploymentType | undefined): boolean {
  return !!type && FLOATING_EMPLOYMENT_TYPES.includes(type);
}

export function branchName(branchId: string | undefined, branches: Branch[]): string {
  if (!branchId) return "—";
  return branches.find((b) => b.id === branchId)?.name ?? "—";
}

/**
 * Builds the OpenRole payload created when a Requisition's final approver
 * signs off (src/lib/requisitions/approval.ts) — the one place every entry
 * path (in-app forms and public links) converts to an Open Role.
 *
 * Public-link submissions have no staff member driving the conversion, so
 * `recruiter` is left "Unassigned" rather than defaulting to the submitter's
 * name (an external requester is not a recruiter).
 */
export function buildOpenRoleFromRequisition(
  req: Requisition,
  branches: Branch[],
  opts?: { isPublicSubmission?: boolean }
): Partial<OpenRole> {
  const branch = branches.find((b) => b.id === req.branchId);
  const isPublic = opts?.isPublicSubmission ?? false;
  const submittedByName = req.submitterName || req.submittedBy;

  return {
    // roleId is server-assigned on POST /api/open-roles (segment-prefixed,
    // e.g. "IPS-001"/"SO-001" matching the existing Airtable convention).
    title: req.roleTitle,
    segment: req.segment,
    department: req.department,
    location: branch
      ? `${branch.name} (${branch.city})`
      : isFloatingEmploymentType(req.employmentType)
        ? "Any branch"
        : "Unassigned",
    branchId: req.branchId,
    priority: req.urgency,
    status: "Open",
    hcApproved: req.headcount,
    hcFilled: 0,
    recruiter: isPublic ? "Unassigned" : submittedByName,
    hiringManager: submittedByName,
    datePosted: new Date().toISOString(),
    employmentType: req.employmentType,
    notes: req.context,
    requisitionId: req.id,
    requisitionSubmitterName: req.submitterName,
    requisitionSubmitterEmail: req.submitterEmail,
  };
}
