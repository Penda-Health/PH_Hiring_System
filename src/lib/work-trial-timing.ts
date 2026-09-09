// Minimum lead time for booking or rescheduling a work trial. Trials always
// start at 9 AM and run the full day, so "how soon can this be" is really
// "how soon can 9 AM on some date be" — this file is the one place that math
// happens, shared by the public booking form (client) and its API route
// (server) so they can never drift out of sync with each other.
//
// Before this existed, same-day reschedules were slipping through: the
// client only blocked "today" via a `minDate` computed once when the page
// loaded (stale on a long-open tab), and the server's reschedule cutoff only
// checked how close the *old* trial date was — it never validated the *new*
// date being submitted at all.
export const MIN_LEAD_HOURS = 10;
export const TRIAL_START_HOUR = 9;

/**
 * Earliest calendar date (local time, midnight) whose 9 AM start is still at
 * least MIN_LEAD_HOURS after `now`. In practice this is "tomorrow" unless
 * `now` is late enough at night that even tomorrow's 9 AM start falls short,
 * in which case it pushes out to the day after.
 */
export function minBookableDate(now: Date = new Date()): Date {
  const cutoff = new Date(now.getTime() + MIN_LEAD_HOURS * 60 * 60 * 1000);
  const d = new Date(cutoff);
  d.setHours(0, 0, 0, 0);
  if (cutoff.getHours() >= TRIAL_START_HOUR) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

/** True if `dateStr` (YYYY-MM-DD) satisfies the minimum lead time as of `now`. */
export function isDateBookable(dateStr: string, now: Date = new Date()): boolean {
  const picked = new Date(`${dateStr}T00:00:00`);
  return picked.getTime() >= minBookableDate(now).getTime();
}

// Default "how far out can a candidate pick a date" window, used whenever a
// Recruitment Manager hasn't set an explicit cutoff on the Settings page
// (see src/app/api/settings/route.ts). Unchanged from the value this file
// used to hardcode client-side only, before the cutoff setting existed.
export const DEFAULT_BOOKING_WINDOW_DAYS = 14;

/**
 * Latest bookable calendar date, given an optional admin-set cutoff and
 * `now`. `cutoffDate` (YYYY-MM-DD) is exclusive — that date and everything
 * after it is closed, so the effective ceiling is the day before it. Falls
 * back to `now + DEFAULT_BOOKING_WINDOW_DAYS` when `cutoffDate` is unset, and
 * never extends *past* that rolling window even when the cutoff is further
 * out — it can only pull the ceiling in, not push it out (the 2-week
 * planning horizon for branches is a separate, always-on constraint).
 *
 * Returns `null` when there's no bookable date left at all — the cutoff has
 * already passed, or falls before the minimum lead time — so callers can
 * show a "bookings are currently closed" state instead of an empty or
 * misleading calendar.
 */
export function maxBookableDate(cutoffDate: string | null | undefined, now: Date = new Date()): Date | null {
  const rollingMax = new Date(now);
  rollingMax.setHours(0, 0, 0, 0);
  rollingMax.setDate(rollingMax.getDate() + DEFAULT_BOOKING_WINDOW_DAYS);

  let effectiveMax = rollingMax;
  if (cutoffDate) {
    const dayBeforeCutoff = new Date(`${cutoffDate}T00:00:00`);
    dayBeforeCutoff.setDate(dayBeforeCutoff.getDate() - 1);
    if (dayBeforeCutoff.getTime() < effectiveMax.getTime()) effectiveMax = dayBeforeCutoff;
  }

  return effectiveMax.getTime() < minBookableDate(now).getTime() ? null : effectiveMax;
}

/** True if `dateStr` (YYYY-MM-DD) satisfies both the minimum lead time and the (optional) booking cutoff, as of `now`. */
export function isWithinBookingWindow(
  dateStr: string,
  cutoffDate: string | null | undefined,
  now: Date = new Date()
): boolean {
  const max = maxBookableDate(cutoffDate, now);
  if (!max) return false;
  const picked = new Date(`${dateStr}T00:00:00`);
  return picked.getTime() <= max.getTime() && isDateBookable(dateStr, now);
}
