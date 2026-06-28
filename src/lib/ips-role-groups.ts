import { Candidate, CandidateStage, OpenRole } from "@/types";

export type IpsRoleGroup = "CO" | "Nurses" | "PharmTech" | "Sonographer" | "COHO" | "Labtech" | "Other";

export const IPS_ROLE_GROUPS: IpsRoleGroup[] = ["CO", "Nurses", "PharmTech", "Sonographer", "COHO", "Labtech", "Other"];

// Maps real Airtable "Open Roles" titles (IPS segment) to a board group.
// Any title not listed here falls into "Other" rather than being dropped
// from the board (see deriveIpsSlots) — that's intentional for roles that
// don't fit the clinical-staffing groups below (e.g. Brand Ambassador).
const TITLE_TO_GROUP: Record<string, IpsRoleGroup> = {
  "Clinical Officer": "CO",
  "Clinical Officer In-charge": "CO",
  "Clinical Officer - Paediatrics": "CO",
  "Clinical Coordinator": "CO",
  "CC Incharge": "CO",
  Nurse: "Nurses",
  "Nurse In-Charge": "Nurses",
  Pharmtech: "PharmTech",
  "Pharmtech In-Charge": "PharmTech",
  Labtech: "Labtech",
  "Labtech Incharge": "Labtech",
  "Sonographer - Resident": "Sonographer",
  "Regional Sonographer": "Sonographer",
  COHO: "COHO",
};

export function getRoleGroup(title: string): IpsRoleGroup {
  return TITLE_TO_GROUP[title] ?? "Other";
}

export interface IpsAllocationSlot {
  openRoleId: string;
  branchId: string;
  roleGroup: IpsRoleGroup;
  priority: OpenRole["priority"];
  title: string;
}

// branch_id on ips_allocations is NOT NULL text with no FK (Airtable record
// id, not a Postgres join) — so roles missing a Branch link in Airtable get
// this placeholder instead of being dropped from the board entirely.
const UNASSIGNED_BRANCH_ID = "unassigned";

/** Derives the role-slots that need IPS meeting coverage from current Airtable OpenRoles. */
export function deriveIpsSlots(openRoles: OpenRole[]): { slots: IpsAllocationSlot[] } {
  const slots: IpsAllocationSlot[] = [];

  for (const role of openRoles) {
    if (role.segment !== "IPS") continue;
    if (role.status === "Filled" || role.status === "Cancelled") continue;
    const roleGroup = getRoleGroup(role.title);
    slots.push({
      openRoleId: role.id,
      branchId: role.branchId || UNASSIGNED_BRANCH_ID,
      roleGroup,
      priority: role.priority,
      title: role.title,
    });
  }

  return { slots };
}

// Excludes Hired/Rejected/Withdrawn — Backup Pool candidates stay selectable
// since they're a real fallback option for that role.
const IPS_SELECTABLE_STAGES: CandidateStage[] = [
  "First Interview",
  "Second Interview",
  "Panel Interview",
  "Work Trial",
  "Reference Check",
  "Offer",
  "Backup Pool",
];

/** Candidates eligible for the allocation-card dropdown: IPS segment, selectable stage, matching role. */
export function getSelectableIpsCandidates(
  candidates: Candidate[],
  openRoles: OpenRole[],
  openRoleId: string
): Candidate[] {
  const role = openRoles.find((r) => r.id === openRoleId);
  if (!role || role.segment !== "IPS") return [];
  return candidates.filter((c) => c.roleId === openRoleId && IPS_SELECTABLE_STAGES.includes(c.stage));
}
