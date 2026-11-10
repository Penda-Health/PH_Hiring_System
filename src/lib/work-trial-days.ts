// Multi-day work trials (e.g. dental candidates who need a second day before
// a final call). Every day is its own WorkTrial record with its own
// supervisor link, scores and reminders; extra days point back at Day 1 via
// parentTrialId. Shared by client and server, so no server-only imports.
import type { WorkTrial } from "@/types";

/** Day 1's record ID — the key every day of the same trial shares. */
export function trialGroupId(t: WorkTrial): string {
  return t.parentTrialId || t.id;
}

export function dayNumberOf(t: WorkTrial): number {
  return t.dayNumber && t.dayNumber > 0 ? t.dayNumber : 1;
}

/** All days of the trial `t` belongs to, Day 1 first. */
export function daysOfTrial(t: WorkTrial, all: WorkTrial[]): WorkTrial[] {
  const group = trialGroupId(t);
  return all.filter((x) => trialGroupId(x) === group).sort((a, b) => dayNumberOf(a) - dayNumberOf(b));
}

/** The highest-numbered day of `t`'s trial — its verdict is the overall result. */
export function latestDayOf(t: WorkTrial, all: WorkTrial[]): WorkTrial {
  const days = daysOfTrial(t, all);
  return days[days.length - 1] ?? t;
}

/** Day number the next added day should get. */
export function nextDayNumber(t: WorkTrial, all: WorkTrial[]): number {
  return Math.max(...daysOfTrial(t, all).map(dayNumberOf), 1) + 1;
}

/**
 * Whether this record's pass/fail is the trial's final word: it is the latest
 * day and its supervisor didn't ask for another one. An earlier day that has
 * been followed by another, or a day flagged "needs another day", never
 * counts on its own.
 */
export function isFinalDay(t: WorkTrial, all: WorkTrial[]): boolean {
  return !t.needsAnotherDay && latestDayOf(t, all).id === t.id;
}
