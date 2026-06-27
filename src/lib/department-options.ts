import { Segment } from "@/types";

// IPS branch-level roles (Incharges, Branch Managers) map to a clinical
// function rather than a free-text department; SO roles map to one of the
// company's actual support-office departments. Both lists are fixed by the
// business, not derived from data, so they live here as the single source
// of truth for every requisition-creation form.
export const IPS_FUNCTIONS = [
  "MCMT",
  "Clinical",
  "Nursing",
  "Pharmacy",
  "Laboratory",
  "Dental",
  "Sonography",
  "Reproductive Health",
] as const;

export const SO_DEPARTMENTS = [
  "Pigia Penda / Call Centre",
  "People & Culture",
  "Finance & Expansion Ops",
  "IT & BI",
  "Growth & Brand",
  "Integrated Supply Chain, Facilities & Assets",
  "Partnerships & External Affairs",
  "Office of the CMO",
  "Office of the CEO",
] as const;

export function departmentOptionsFor(segment: Segment): readonly string[] {
  return segment === "SO" ? SO_DEPARTMENTS : IPS_FUNCTIONS;
}
