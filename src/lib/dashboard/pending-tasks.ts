// "My pending tasks" for the /profile page. There's no foreign key from any
// Airtable record to a Supabase user — assignee fields like
// WorkTrials.SUPERVISOR or Interviews.INTERVIEWERS are free text. So this is
// a heuristic, case-insensitive name/email match, not a precise join. Good
// enough for a v1 "things that might need you" nudge, not a guarantee.
import { Candidate, Interview, Offer, OpenRole, ReferenceCheck, User, WorkTrial } from "@/types";

export type TaskSeverity = "overdue" | "due-soon" | "upcoming";

export interface PendingTask {
  id: string;
  label: string;
  detail: string;
  severity: TaskSeverity;
  href: string;
}

export const SEVERITY_STYLES: Record<TaskSeverity, string> = {
  overdue: "bg-critical-bg text-critical-fg border-transparent",
  "due-soon": "bg-amber-100 text-amber-800 border-transparent dark:bg-amber-950 dark:text-amber-300",
  upcoming: "bg-blue-100 text-blue-800 border-transparent dark:bg-blue-950 dark:text-blue-300",
};

function matchesUser(text: string | string[] | undefined, user: User): boolean {
  if (!text) return false;
  const haystack = (Array.isArray(text) ? text.join(" ") : text).toLowerCase();
  if (!haystack.trim()) return false;
  const email = user.email.toLowerCase();
  const firstName = user.name.split(" ")[0]?.toLowerCase();
  return haystack.includes(email) || (!!firstName && firstName.length > 1 && haystack.includes(firstName));
}

function daysSince(iso: string): number {
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24);
}

function daysUntil(iso: string): number {
  return (new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
}

interface PendingTasksInput {
  workTrials: WorkTrial[];
  offers: Offer[];
  referenceChecks: ReferenceCheck[];
  interviews: Interview[];
  candidates: Candidate[];
  openRoles: OpenRole[];
}

export function getPendingTasks(user: User, data: PendingTasksInput): PendingTask[] {
  const tasks: PendingTask[] = [];
  const roleForCandidate = (candidateId: string) => {
    const candidate = data.candidates.find((c) => c.id === candidateId);
    if (!candidate) return undefined;
    return data.openRoles.find((r) => r.id === candidate.roleId);
  };

  // Overdue work-trial scores: candidate showed up, no scores submitted yet.
  for (const wt of data.workTrials) {
    if (!matchesUser(wt.supervisor, user)) continue;
    if (wt.arrivalMarked !== true || wt.total !== null) continue;
    const overdueDays = daysSince(wt.date);
    if (overdueDays < 0) continue;
    tasks.push({
      id: `wt-${wt.id}`,
      label: `Score work trial for ${wt.wtId}`,
      detail: `Trial was ${Math.floor(overdueDays)}d ago — scores not submitted yet`,
      severity: overdueDays > 1 ? "overdue" : "due-soon",
      href: "/work-trials",
    });
  }

  // Offers past their decision deadline, still open.
  for (const offer of data.offers) {
    if (offer.outcome !== "Pending" && offer.outcome !== "Negotiating") continue;
    const role = roleForCandidate(offer.candidateId);
    if (!matchesUser(role?.recruiter, user)) continue;
    const overdueDays = daysSince(offer.deadline);
    if (overdueDays < -2) continue; // not due soon enough yet
    tasks.push({
      id: `offer-${offer.id}`,
      label: `Follow up on offer ${offer.offerId}`,
      detail: overdueDays >= 0 ? `Deadline passed ${Math.floor(overdueDays)}d ago` : `Deadline in ${Math.ceil(-overdueDays)}d`,
      severity: overdueDays >= 0 ? "overdue" : "due-soon",
      href: "/offers",
    });
  }

  // Referee reminders with no response after 48h.
  for (const refCheck of data.referenceChecks) {
    const role = roleForCandidate(refCheck.candidateId);
    if (!matchesUser(role?.recruiter, user)) continue;
    for (const [num, referee] of [[1, refCheck.referee1], [2, refCheck.referee2]] as const) {
      if (referee.responded || !referee.emailSent) continue;
      const waitDays = daysSince(refCheck.createdAt);
      if (waitDays < 2) continue;
      tasks.push({
        id: `ref-${refCheck.id}-${num}`,
        label: `Chase referee ${num} for ${refCheck.refId}`,
        detail: `No response after ${Math.floor(waitDays)}d`,
        severity: waitDays > 4 ? "overdue" : "due-soon",
        href: "/reference-checks",
      });
    }
  }

  // Unconfirmed upcoming interviews.
  for (const interview of data.interviews) {
    if (!matchesUser(interview.interviewers, user)) continue;
    if (interview.confirmed) continue;
    const daysAway = daysUntil(interview.date);
    if (daysAway < -1) continue; // too far in the past, not actionable
    tasks.push({
      id: `iv-${interview.id}`,
      label: `Confirm interview ${interview.schedId}`,
      detail: daysAway >= 0 ? `${Math.ceil(daysAway)}d away, not confirmed` : `Was ${Math.floor(-daysAway)}d ago, never confirmed`,
      severity: daysAway < 0 ? "overdue" : daysAway < 1 ? "due-soon" : "upcoming",
      href: "/interviews",
    });
  }

  const order: Record<TaskSeverity, number> = { overdue: 0, "due-soon": 1, upcoming: 2 };
  return tasks.sort((a, b) => order[a.severity] - order[b.severity]);
}
