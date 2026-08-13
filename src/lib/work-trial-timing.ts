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
