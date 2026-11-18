// How the Requisition Intake page groups, filters and sorts requisitions.
// A requisition's "stage" folds its own status together with the role it
// became, so a requisition whose role has since been filled or cancelled
// reads as closed rather than sitting forever as "Converted to Open Role".
import type { Branch, OpenRole, Priority, Requisition, Segment, User } from "@/types";
import { isRoleClosed } from "@/lib/role-status";
import { sameEmail } from "@/lib/requisitions/workflow";

export type RequisitionStage = "pending" | "hiring" | "closed";

export type RequisitionView = "active" | "mine" | RequisitionStage | "all";

export const VIEW_LABELS: Record<RequisitionView, string> = {
  active: "Active",
  mine: "Waiting on me",
  pending: "Pending approval",
  hiring: "Approved — hiring",
  closed: "Closed",
  all: "All",
};

export interface RequisitionFilterState {
  view: RequisitionView;
  search: string;
  segment: "All" | Segment;
  branchId: "All" | string;
  urgency: "All" | Priority;
}

export const DEFAULT_REQUISITION_FILTERS: RequisitionFilterState = {
  view: "active",
  search: "",
  segment: "All",
  branchId: "All",
  urgency: "All",
};

export function roleForRequisition(req: Requisition, roles: OpenRole[]): OpenRole | undefined {
  return roles.find((r) => r.requisitionId === req.id);
}

export function stageOf(req: Requisition, role: OpenRole | undefined): RequisitionStage {
  if (req.status === "Pending Approval") return "pending";
  if (req.status === "Rejected") return "closed";
  return role && isRoleClosed(role.status) ? "closed" : "hiring";
}

export function isWaitingOn(req: Requisition, user: User | null): boolean {
  return req.status === "Pending Approval" && !!user?.email && sameEmail(req.currentApproverEmail, user.email);
}

export interface RequisitionRow {
  req: Requisition;
  role: OpenRole | undefined;
  stage: RequisitionStage;
  waitingOnMe: boolean;
}

export function buildRows(requisitions: Requisition[], roles: OpenRole[], user: User | null): RequisitionRow[] {
  const byReq = new Map<string, OpenRole>();
  for (const r of roles) if (r.requisitionId && !byReq.has(r.requisitionId)) byReq.set(r.requisitionId, r);
  return requisitions.map((req) => {
    const role = byReq.get(req.id);
    return { req, role, stage: stageOf(req, role), waitingOnMe: isWaitingOn(req, user) };
  });
}

const URGENCY_RANK: Record<Priority, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const STAGE_RANK: Record<RequisitionStage, number> = { pending: 0, hiring: 1, closed: 2 };

/** Waiting on me first, then pending, hiring, closed; within each, most urgent then newest. */
export function compareRows(a: RequisitionRow, b: RequisitionRow): number {
  return (
    Number(b.waitingOnMe) - Number(a.waitingOnMe) ||
    STAGE_RANK[a.stage] - STAGE_RANK[b.stage] ||
    (URGENCY_RANK[a.req.urgency] ?? 9) - (URGENCY_RANK[b.req.urgency] ?? 9) ||
    (b.req.submittedAt || "").localeCompare(a.req.submittedAt || "")
  );
}

export function matchesView(row: RequisitionRow, view: RequisitionView): boolean {
  switch (view) {
    case "all":
      return true;
    case "active":
      return row.stage !== "closed";
    case "mine":
      return row.waitingOnMe;
    default:
      return row.stage === view;
  }
}

/** Every filter except the view — the view tabs count against this set. */
export function matchesFilters(row: RequisitionRow, f: RequisitionFilterState, branches: Branch[]): boolean {
  const { req } = row;
  if (f.segment !== "All" && req.segment !== f.segment) return false;
  if (f.branchId !== "All" && req.branchId !== f.branchId) return false;
  if (f.urgency !== "All" && req.urgency !== f.urgency) return false;
  const q = f.search.trim().toLowerCase();
  if (q) {
    const branch = branches.find((b) => b.id === req.branchId)?.name ?? "";
    const hay = [req.reqId, req.roleTitle, req.department, req.type, req.submitterName, req.submittedBy, req.currentApproverName, branch]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

export function formatSubmitted(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(d.getTime())) return "";
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
