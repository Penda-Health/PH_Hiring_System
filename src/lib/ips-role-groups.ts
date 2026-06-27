import { Candidate, CandidateStage, OpenRole } from "@/types";

export type IpsRoleGroup = "CO" | "Nurses" | "PharmTech" | "Sonographer" | "COHO" | "Labtech" | "Other";

export const IPS_ROLE_GROUPS: IpsRoleGroup[] = ["CO", "Nurses", "PharmTech", "Sonographer", "COHO", "Labtech", "Other"];

// No real OpenRole.title in Airtable maps to "Sonographer" yet — that group
// stays empty in the "By role" view until Airtable has a matching role.
// Add the title here once it exists. Any title not listed here falls into
// "Other" rather than being dropped from the board (see deriveIpsSlots).
const TITLE_TO_GROUP: Record<string, IpsRoleGroup> = {
  "Clinical Officer": "CO",
  Nurse: "Nurses",
  "Pharm Tech": "PharmTech",
  "Lab Technician": "Labtech",
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

/** Derives the role-slots that need IPS meeting coverage from current Airtable OpenRoles. */
export function deriveIpsSlots(openRoles: OpenRole[]): { slots: IpsAllocationSlot[] } {
  const slots: IpsAllocationSlot[] = [];

  for (const role of openRoles) {
    if (role.segment !== "IPS" || !role.branchId) continue;
    if (role.status === "Filled" || role.status === "Cancelled") continue;
    const roleGroup = getRoleGroup(role.title);
    slots.push({ openRoleId: role.id, branchId: role.branchId, roleGroup, priority: role.priority, title: role.title });
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
