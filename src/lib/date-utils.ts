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
