import { Candidate, CandidateStage, OpenRole } from "@/types";

// Grouped by Airtable's "Department" field (a controlled-vocabulary column
// on Open Roles — category/function, not the free-text Title) rather than
// matching on Title strings, which proved fragile: Title has many ad-hoc
// variants ("Pharmtech" vs "Pharmtech In-Charge", "Labtech Incharge", etc.)
// that don't reliably bucket into a stable set of groups, while Department
// already is that stable set.
export type IpsRoleGroup =
  | "Clinical Services"
  | "Nursing"
  | "Pharmacy"
  | "Laboratory"
  | "Sonography"
  | "Dental"
  | "Front Office"
  | "Growth & Brand"
  | "Pigia Penda / Call Centre"
  | "Other";

export const IPS_ROLE_GROUPS: IpsRoleGroup[] = [
  "Clinical Services",
  "Nursing",
  "Pharmacy",
  "Laboratory",
  "Sonography",
  "Dental",
  "Front Office",
  "Growth & Brand",
  "Pigia Penda / Call Centre",
  "Other",
];

const KNOWN_GROUPS = new Set<string>(IPS_ROLE_GROUPS);

/** Any Department value Airtable doesn't yet have a named group for falls into "Other" rather than being dropped. */
export function getRoleGroup(department: string): IpsRoleGroup {
  return KNOWN_GROUPS.has(department) ? (department as IpsRoleGroup) : "Other";
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
    const roleGroup = getRoleGroup(role.department);
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
