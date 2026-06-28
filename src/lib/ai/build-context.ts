import { Candidate, Offer, OpenRole } from "@/types";
import { getKpis, getSegmentSplit, getStageCounts } from "@/lib/dashboard-metrics";

export type AiContext = ReturnType<typeof buildAiContext>;

// The only data this function may touch from `candidates`/`offers` is
// aggregate counts (via the existing dashboard-metrics helpers) — never the
// arrays themselves. `OpenRole` has no candidate-identifying fields, so the
// roster below is safe to send to any provider as-is.
export function buildAiContext(data: { openRoles: OpenRole[]; candidates: Candidate[]; offers: Offer[] }) {
  const { openRoles, candidates, offers } = data;
  const kpis = getKpis(openRoles, candidates, offers);
  const segmentSplit = getSegmentSplit(openRoles, candidates);
  const stageCounts = getStageCounts(candidates);

  const roster = openRoles.map((r) => ({
    id: r.id,
    roleId: r.roleId,
    title: r.title,
    segment: r.segment,
    department: r.department,
    status: r.status,
    priority: r.priority,
    hcApproved: r.hcApproved,
    hcFilled: r.hcFilled,
    hcGap: Math.max(r.hcApproved - r.hcFilled, 0),
  }));

  // Pre-aggregated so "break this down by department" doesn't push the model
  // toward enumerating raw roster entries (and their internal record ids) to
  // answer a question that's really just a group-by-count. Matches the
  // "Open" status convention used dashboard-wide (dashboard-metrics.ts).
  const departmentBreakdown = (() => {
    const byKey = new Map<string, { segment: string; department: string; openRoleCount: number; hcGap: number }>();
    for (const r of openRoles) {
      if (r.status !== "Open") continue;
      const key = `${r.segment}::${r.department}`;
      const entry = byKey.get(key) ?? { segment: r.segment, department: r.department, openRoleCount: 0, hcGap: 0 };
      entry.openRoleCount += 1;
      entry.hcGap += Math.max(r.hcApproved - r.hcFilled, 0);
      byKey.set(key, entry);
    }
    return Array.from(byKey.values()).sort((a, b) => b.hcGap - a.hcGap);
  })();

  return { kpis, segmentSplit, stageCounts, departmentBreakdown, roster };
}

export function buildSystemPrompt(context: AiContext, canEdit: boolean) {
  return [
    "You are Penny, an AI assistant inside Penda Health's recruitment dashboard.",
    "Answer questions about hiring pipeline status using only the JSON context below — it contains aggregate metrics, a department breakdown, and a roster of open roles. There are no candidate names, emails, or other personal data here. Never claim to know candidate-level details; you don't have them.",
    "Formatting rules for your answers: write for a human reading a chat window, not a data dump. Use plain numbers and titles (e.g. \"Clinical Officer — Umoja 1\"). NEVER print the `id` or `roleId` fields (e.g. anything starting with \"rec\") in your visible answer — those are internal references for tool calls only. For \"by department\" or \"breakdown\" questions, use the `departmentBreakdown` array directly (it's already grouped and counted) instead of listing every roster entry. Keep answers short: a few sentences or a tight bullet list, not an exhaustive enumeration.",
    "If asked to change a role's status, call the setRoleStatus tool with the role's exact `id` and `title` from the roster — do not invent ids, and do not show the id to the user. Always state which role (by title) and new status you're proposing before calling the tool.",
    canEdit
      ? "The current user has permission to edit recruitment data."
      : "The current user is VIEW-ONLY and cannot edit recruitment data. If they ask you to change anything, explain that their role doesn't permit edits instead of proposing the tool call.",
    "Context:",
    JSON.stringify(context),
  ].join("\n\n");
}
