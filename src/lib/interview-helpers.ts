import { Candidate, Interview, InterviewStage, OpenRole } from "@/types";

export function getCandidateForInterview(interview: Interview, candidates: Candidate[]) {
  return candidates.find((c) => c.id === interview.candidateId);
}

export function getRoleForInterview(interview: Interview, openRoles: OpenRole[]) {
  return openRoles.find((r) => r.id === interview.roleId);
}

export function groupByWeek(interviews: Interview[]) {
  const sorted = [...interviews].sort(
    (a, b) => new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime()
  );
  const groups = new Map<string, Interview[]>();
  for (const interview of sorted) {
    const list = groups.get(interview.weekLabel) ?? [];
    list.push(interview);
    groups.set(interview.weekLabel, list);
  }
  return Array.from(groups.entries());
}

export const interviewStages: InterviewStage[] = ["First Interview", "Second Interview", "Panel Interview"];

export function computeWeekLabel(dateStr: string): { weekLabel: string; month: string } {
  const d = new Date(`${dateStr}T00:00:00`);
  const weekOfMonth = Math.ceil(d.getDate() / 7);
  const monthShort = d.toLocaleDateString("en-US", { month: "short" });
  const year = d.getFullYear();
  return { weekLabel: `W${weekOfMonth} ${monthShort} ${year}`, month: `${monthShort} ${year}` };
}
