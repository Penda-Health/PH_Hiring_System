// Joining tracker for hired candidates — did someone who signed actually
// start? Pure helpers shared by the Candidates page and dashboard metrics.
import { Candidate } from "@/types";

export type JoiningState = "no-date" | "upcoming" | "overdue" | "joined" | "dropped";

function todayIso(): string {
  // Local date, not UTC — a hire due "today" in Nairobi shouldn't flip to
  // overdue at 3am because UTC already rolled over.
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Only meaningful for candidates at the Hired stage. */
export function joiningState(c: Candidate, today = todayIso()): JoiningState {
  if (c.joined === "Joined") return "joined";
  if (c.joined === "Did Not Join") return "dropped";
  if (!c.expectedJoiningDate) return "no-date";
  return c.expectedJoiningDate < today ? "overdue" : "upcoming";
}

/**
 * Hired candidates on a role who haven't been confirmed as reported yet
 * (still Pending — no Joined / Did Not Join recorded). A role isn't closed as Filled while
 * any of these remain — signing an offer isn't the same as starting.
 */
export function hiresAwaitingReport(candidates: Candidate[], roleId: string): Candidate[] {
  return candidates.filter((c) => c.roleId === roleId && isAwaitingReport(c));
}

/** Hired, but neither Joined nor Did Not Join recorded yet ("Pending" or blank). */
export function isAwaitingReport(c: Candidate): boolean {
  return c.stage === "Hired" && c.joined !== "Joined" && c.joined !== "Did Not Join";
}

export function formatShortDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-KE", { day: "numeric", month: "short" });
}

export function joiningLabel(c: Candidate): string {
  switch (joiningState(c)) {
    case "joined":
      return c.joinedOn ? `Joined ${formatShortDate(c.joinedOn)}` : "Joined";
    case "dropped":
      return "Did not join";
    case "overdue":
      return `Due ${formatShortDate(c.expectedJoiningDate)} — confirm`;
    case "upcoming":
      return `Joins ${formatShortDate(c.expectedJoiningDate)}`;
    default:
      return "No joining date";
  }
}

export const JOINING_STYLES: Record<JoiningState, string> = {
  "no-date": "text-muted-foreground",
  upcoming: "text-penda-blue",
  overdue: "text-amber-700 font-medium",
  joined: "text-emerald-700",
  dropped: "text-destructive",
};

/**
 * Of the hires whose outcome is known, the share who signed but never
 * started. `null` until at least one outcome has been recorded.
 */
export function dropOffRate(candidates: Candidate[]): { rate: number | null; joined: number; dropped: number } {
  const hired = candidates.filter((c) => c.stage === "Hired");
  const joined = hired.filter((c) => c.joined === "Joined").length;
  const dropped = hired.filter((c) => c.joined === "Did Not Join").length;
  const decided = joined + dropped;
  return { rate: decided ? (dropped / decided) * 100 : null, joined, dropped };
}
