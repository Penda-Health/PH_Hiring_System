import { Cadre } from "@/types";

// The 5 cadres tracked by the Staffing Projections page, in a fixed display
// order (used everywhere a cadre list is rendered so column/row order never
// shuffles between renders). Mirrors CADRES in scripts/lib/airtable-schema.js.
export const CADRES: Cadre[] = ["CC", "Labtech", "Nurse", "Pharmtech", "Clinical Officer"];

// Pulled directly from the "Assumptions" tab of the source staffing model
// (see the Staffing Projections feature brief) — kept as named constants,
// not inlined, so a future change to any one of them is a one-line edit.
export const STAFFING_ASSUMPTIONS = {
  /** Hours a single full-time HC represents in a month. */
  hoursPerFullTimeHc: 200,
  /** Share of current staff eligible to pick up internal locum shifts. */
  internalLocumEligiblePct: 0.3,
  /** Max internal-locum hours a single eligible person can take in a month. */
  maxInternalLocumHoursPerPerson: 50,
  /** |adjustment| below this many HC counts as "Balanced", not a real gap. */
  gapThresholdHc: 0.3,
} as const;

// Real Open Roles titles for these 5 cadres are messy free text (e.g.
// "Nurse In-Charge", "Pharmtech In-Charge", "Pharm Tech", "Sonographer -
// Resident") and don't carry a Cadre value until someone sets it in
// Airtable. Rather than block the whole page on a manual backfill, fall
// back to inferring a cadre from the title so the page is useful from day
// one — this is ONLY ever used to fill a gap for display, never written
// back to Airtable (see openRoleFromAirtable/openRoleToAirtable, which
// don't call this). Order matters: more specific patterns first.
export function inferCadreFromTitle(title: string): Cadre | undefined {
  const t = title.toLowerCase();
  if (/coordinator/.test(t)) return "CC";
  if (/pharm/.test(t)) return "Pharmtech";
  if (/\blab\b|laborator|lab\s*tech/.test(t)) return "Labtech";
  if (/nurse/.test(t)) return "Nurse";
  if (/clinical officer|\bcoho\b/.test(t)) return "Clinical Officer";
  return undefined;
}

/** First-of-month "YYYY-MM-01" for the given date (defaults to now). */
export function currentMonthKey(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

/** The month key immediately after the given one — for "next month" projections. */
export function nextMonthKey(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + 1, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

/** "YYYY-MM" prefix, so a stored date (any day-of-month) still matches its month key. */
export function monthPrefix(dateStr: string): string {
  return dateStr.slice(0, 7);
}

export function formatMonthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
