// All Branch × Cadre aggregation for the Staffing Projections page happens
// here, computed in TypeScript from the full in-memory dataset every time —
// deliberately never a partial/keyed lookup or a fixed list of cells. The
// source staffing model this feature is based on had a real bug where
// org-wide totals were built from fixed cell references and silently
// dropped 3 branches added later; summing over the full branches/openRoles
// arrays each time is how that class of bug is avoided here.
import { Branch, Cadre, OpenRole, StaffingProjection } from "@/types";
import { CADRES, STAFFING_ASSUMPTIONS, inferCadreFromTitle, monthPrefix } from "./constants";

export function resolveCadre(role: OpenRole): Cadre | undefined {
  return role.cadre ?? inferCadreFromTitle(role.title);
}

function roleBranchIds(role: OpenRole): string[] {
  if (role.branchIds?.length) return role.branchIds;
  return role.branchId ? [role.branchId] : [];
}

/** Sum of hcApproved for a branch+cadre — the page's Required HC, always derived live, never stored. */
export function requiredHcFor(branchId: string, cadre: Cadre, openRoles: OpenRole[]): number {
  return openRoles
    .filter((r) => r.status !== "Cancelled" && resolveCadre(r) === cadre && roleBranchIds(r).includes(branchId))
    .reduce((sum, r) => sum + (r.hcApproved || 0), 0);
}

/** The People-Ops-confirmed Current Staffing HC for a branch+cadre+month, or undefined if never entered. */
export function currentHcFor(
  branchId: string,
  cadre: Cadre,
  monthKey: string,
  projections: StaffingProjection[]
): StaffingProjection | undefined {
  const targetPrefix = monthPrefix(monthKey);
  return projections.find(
    (p) => p.branchId === branchId && p.cadre === cadre && monthPrefix(p.month) === targetPrefix
  );
}

export type GapStatus = "no-data" | "understaffed" | "balanced" | "overstaffed";

export interface GapCell {
  branchId: string;
  branchName: string;
  cadre: Cadre;
  required: number;
  /** undefined when no one has confirmed Current Staffing HC for this cell yet this month. */
  current?: number;
  /** current - required; negative = understaffed. undefined when current is undefined. */
  adjustment?: number;
  status: GapStatus;
  hoursShortfall: number;
  internalLocumHours: number;
  unallocatedHours: number;
  externalLocumHcNeeded: number;
  projectionId?: string;
  notes?: string;
  updatedBy?: string;
  updatedAt?: string;
}

export function computeGapCell(
  branchId: string,
  branchName: string,
  cadre: Cadre,
  monthKey: string,
  openRoles: OpenRole[],
  projections: StaffingProjection[]
): GapCell {
  const required = requiredHcFor(branchId, cadre, openRoles);
  const projection = currentHcFor(branchId, cadre, monthKey, projections);
  const current = projection?.currentStaffingHc;

  if (current === undefined) {
    return {
      branchId,
      branchName,
      cadre,
      required,
      status: "no-data",
      hoursShortfall: 0,
      internalLocumHours: 0,
      unallocatedHours: 0,
      externalLocumHcNeeded: 0,
    };
  }

  const adjustment = current - required;
  const { hoursPerFullTimeHc, internalLocumEligiblePct, maxInternalLocumHoursPerPerson, gapThresholdHc } =
    STAFFING_ASSUMPTIONS;
  const shortfallHc = Math.max(0, -adjustment);
  const hoursShortfall = shortfallHc * hoursPerFullTimeHc;
  const internalLocumHours = current * internalLocumEligiblePct * maxInternalLocumHoursPerPerson;
  const unallocatedHours = Math.max(0, hoursShortfall - internalLocumHours);
  const externalLocumHcNeeded = unallocatedHours / hoursPerFullTimeHc;

  const status: GapStatus =
    adjustment <= -gapThresholdHc ? "understaffed" : adjustment >= gapThresholdHc ? "overstaffed" : "balanced";

  return {
    branchId,
    branchName,
    cadre,
    required,
    current,
    adjustment,
    status,
    hoursShortfall,
    internalLocumHours,
    unallocatedHours,
    externalLocumHcNeeded,
    projectionId: projection?.id,
    notes: projection?.notes,
    updatedBy: projection?.updatedBy,
    updatedAt: projection?.updatedAt,
  };
}

/** Every IPS branch × all 5 cadres for the given month — the full heatmap grid, nothing pre-filtered. */
export function buildGapMatrix(
  branches: Branch[],
  openRoles: OpenRole[],
  projections: StaffingProjection[],
  monthKey: string
): GapCell[] {
  const ipsBranches = branches.filter((b) => b.segment === "IPS" && b.active);
  const cells: GapCell[] = [];
  for (const branch of ipsBranches) {
    for (const cadre of CADRES) {
      cells.push(computeGapCell(branch.id, branch.name, cadre, monthKey, openRoles, projections));
    }
  }
  return cells;
}

export interface CadreSummary {
  cadre: Cadre;
  required: number;
  current: number;
  /** Branches with no Current Staffing HC entered yet this month. */
  unconfirmed: number;
  gapHc: number;
  externalLocumHcNeeded: number;
}

export function summarizeByCadre(cells: GapCell[]): CadreSummary[] {
  return CADRES.map((cadre) => {
    const rows = cells.filter((c) => c.cadre === cadre);
    return {
      cadre,
      required: rows.reduce((s, c) => s + c.required, 0),
      current: rows.reduce((s, c) => s + (c.current ?? 0), 0),
      unconfirmed: rows.filter((c) => c.status === "no-data").length,
      gapHc: rows.reduce((s, c) => s + Math.min(0, c.adjustment ?? 0), 0),
      externalLocumHcNeeded: rows.reduce((s, c) => s + c.externalLocumHcNeeded, 0),
    };
  });
}

export interface OrgSummary {
  branchCount: number;
  required: number;
  current: number;
  unconfirmed: number;
  understaffedCells: number;
  overstaffedCells: number;
  externalLocumHcNeeded: number;
}

export function summarizeOrg(cells: GapCell[]): OrgSummary {
  return {
    branchCount: new Set(cells.map((c) => c.branchId)).size,
    required: cells.reduce((s, c) => s + c.required, 0),
    current: cells.reduce((s, c) => s + (c.current ?? 0), 0),
    unconfirmed: cells.filter((c) => c.status === "no-data").length,
    understaffedCells: cells.filter((c) => c.status === "understaffed").length,
    overstaffedCells: cells.filter((c) => c.status === "overstaffed").length,
    externalLocumHcNeeded: cells.reduce((s, c) => s + c.externalLocumHcNeeded, 0),
  };
}
