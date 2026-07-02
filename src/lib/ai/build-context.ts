import { Branch, Candidate, Interview, Offer, OpenRole, WorkTrial } from "@/types";
import { getKpis, getSegmentSplit, getStageCounts } from "@/lib/dashboard-metrics";

export type AiContext = ReturnType<typeof buildAiContext>;

// Privacy rule enforced here: every aggregate below is derived from raw
// arrays but never exposes a person's name, email, or phone. Only counts,
// dates, role titles, branch names, and stage labels flow to external AI
// providers. Internal Airtable IDs (`id`, `roleId`) are included in the
// roster so tool calls can reference records — they are never shown in the
// visible assistant text (enforced in the system prompt).
export function buildAiContext(data: {
  openRoles: OpenRole[];
  candidates: Candidate[];
  offers: Offer[];
  branches?: Branch[];
  interviews?: Interview[];
  workTrials?: WorkTrial[];
}) {
  const { openRoles, candidates, offers, branches = [], interviews = [], workTrials = [] } = data;

  const kpis = getKpis(openRoles, candidates, offers);
  const segmentSplit = getSegmentSplit(openRoles, candidates);
  const stageCounts = getStageCounts(candidates);

  const roster = openRoles.map((r) => ({
    id: r.id,
    roleId: r.roleId,
    title: r.title,
    segment: r.segment,
    department: r.department,
    location: r.location,
    status: r.status,
    priority: r.priority,
    recruiter: r.recruiter,
    hcApproved: r.hcApproved,
    hcFilled: r.hcFilled,
    hcGap: Math.max(r.hcApproved - r.hcFilled, 0),
    candidatesInPipeline: candidates.filter(
      (c) =>
        c.roleId === r.id &&
        !["Hired", "Rejected", "Withdrawn", "Backup Pool"].includes(c.stage)
    ).length,
  }));

  // Pre-aggregated so breakdown questions don't enumerate every roster entry.
  const departmentBreakdown = (() => {
    const byKey = new Map<string, { segment: string; department: string; openRoleCount: number; hcGap: number; candidatesInPipeline: number }>();
    for (const r of openRoles) {
      if (r.status !== "Open") continue;
      const key = `${r.segment}::${r.department}`;
      const entry = byKey.get(key) ?? { segment: r.segment, department: r.department, openRoleCount: 0, hcGap: 0, candidatesInPipeline: 0 };
      entry.openRoleCount += 1;
      entry.hcGap += Math.max(r.hcApproved - r.hcFilled, 0);
      entry.candidatesInPipeline += candidates.filter(
        (c) => c.roleId === r.id && !["Hired", "Rejected", "Withdrawn", "Backup Pool"].includes(c.stage)
      ).length;
      byKey.set(key, entry);
    }
    return Array.from(byKey.values()).sort((a, b) => b.hcGap - a.hcGap);
  })();

  // Branch-level breakdown — answers "which branches need the most hires?"
  const branchBreakdown = (() => {
    const branchMap = new Map(branches.map((b) => [b.id, b.name]));
    const byBranch = new Map<string, { branchName: string; openRoleCount: number; hcGap: number }>();
    for (const r of openRoles) {
      if (r.status !== "Open" || !r.branchId) continue;
      const name = branchMap.get(r.branchId) ?? r.location;
      const entry = byBranch.get(name) ?? { branchName: name, openRoleCount: 0, hcGap: 0 };
      entry.openRoleCount += 1;
      entry.hcGap += Math.max(r.hcApproved - r.hcFilled, 0);
      byBranch.set(name, entry);
    }
    return Array.from(byBranch.values()).sort((a, b) => b.hcGap - a.hcGap);
  })();

  // Interview pipeline — counts only, no names.
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const interviewSummary = {
    totalScheduled: interviews.length,
    upcoming7Days: interviews.filter((i) => {
      const d = new Date(i.date);
      return d >= now && d <= weekFromNow;
    }).length,
    noShowCount: interviews.filter((i) => i.attendance === "No-show").length,
    attendedCount: interviews.filter((i) => i.attendance === "Attended").length,
    pendingCount: interviews.filter((i) => i.attendance === "Pending").length,
  };

  // Work trial pipeline — aggregate status only, no names.
  const workTrialSummary = {
    total: workTrials.length,
    awaitingArrival: workTrials.filter((t) => t.arrivalMarked === null).length,
    awaitingScore: workTrials.filter((t) => t.arrivalMarked !== null && t.total === null).length,
    passed: workTrials.filter((t) => t.passFail === "Pass").length,
    failed: workTrials.filter((t) => t.passFail === "Fail").length,
  };

  // Offer pipeline — aggregate outcomes only, no names.
  const offerSummary = {
    total: offers.length,
    pending: offers.filter((o) => o.outcome === "Pending").length,
    negotiating: offers.filter((o) => o.outcome === "Negotiating").length,
    accepted: offers.filter((o) => o.outcome === "Accepted").length,
    declined: offers.filter((o) => o.outcome === "Declined").length,
    withdrawn: offers.filter((o) => o.outcome === "Withdrawn").length,
  };

  return {
    kpis,
    segmentSplit,
    stageCounts,
    departmentBreakdown,
    branchBreakdown,
    roster,
    interviewSummary,
    workTrialSummary,
    offerSummary,
  };
}

export function buildSystemPrompt(context: AiContext, canEdit: boolean) {
  return [
    "You are Penny, an AI assistant inside Penda Health's recruitment dashboard.",
    "Answer questions about hiring pipeline status using only the JSON context below. It contains aggregate metrics (no personal data — no candidate names, emails, or phone numbers). Never claim to know candidate identities; you only have counts and role-level data.",
    "Context includes: KPIs, segment split, stage counts (how many candidates per stage), department breakdown, branch breakdown (branch-level HC gaps), a roster of all open roles (including candidates in pipeline per role), interview pipeline summary, work trial summary, and offer summary.",
    "Formatting rules: write for a human reading a chat window. Use plain role titles and branch names. NEVER print `id` or `roleId` field values (anything starting with \"rec\") in visible text — they are for tool calls only. For breakdown questions, prefer the pre-aggregated arrays (`departmentBreakdown`, `branchBreakdown`) over listing individual roster entries. Keep answers short: a few sentences or a tight bullet list.",
    "If asked to change a role's status, call the setRoleStatus tool with the role's exact `id` and `title` from the roster — do not invent ids, and do not show the id to the user. Always confirm the role title and proposed status before calling the tool.",
    canEdit
      ? "The current user has permission to edit recruitment data."
      : "The current user is VIEW-ONLY and cannot edit recruitment data. If they ask you to change anything, explain that their role doesn't permit edits instead of proposing the tool call.",
    "Context:",
    JSON.stringify(context),
  ].join("\n\n");
}
