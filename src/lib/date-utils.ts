// Shared fractional-day math. Both offers-helpers.ts and dashboard/pending-tasks.ts
// used to compute `(target - now) / dayMs` themselves — same formula, but each
// picked its own rounding (Math.ceil vs Math.floor) at different call sites, which
// made it easy for the two to quietly drift. The raw fractional diff lives here;
// each caller keeps deciding floor vs ceil for its own display (a partial day
// "since" something should usually count as elapsed → floor, while a partial day
// "until" a deadline usually shouldn't count as reached yet → ceil).
const DAY_MS = 1000 * 60 * 60 * 24;

/** Fractional days from `iso` until now. Positive means `iso` is in the past. */
export function daysSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / DAY_MS;
}

/** Fractional days from now until `iso`. Positive means `iso` is in the future. */
export function daysUntil(iso: string): number {
  return (new Date(iso).getTime() - Date.now()) / DAY_MS;
}

/**
 * True if `iso` falls within the last `months` × 30 days (rolling, not
 * calendar-month, so a record from yesterday is never dropped just because
 * the calendar month rolled over) — or always, when `months` is "all".
 * A missing/unparseable date passes through: a record silently vanishing
 * because a date field was never set is worse than an unfiltered one
 * showing up. See pipeline-helpers.ts's isRoleInMonthRange, which this
 * generalizes for lists that aren't roles (e.g. work trials, reference
 * checks) — same rolling-window math, one place to get it right.
 */
export function isWithinMonthRange(
  iso: string | null | undefined,
  months: "1" | "3" | "6" | "9" | "all",
  now: Date = new Date()
): boolean {
  if (months === "all" || !iso) return true;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return true;
  const days = Number(months) * 30;
  const windowStart = now.getTime() - days * DAY_MS;
  return t >= windowStart;
}
