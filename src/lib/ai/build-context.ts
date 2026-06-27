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

  return { kpis, segmentSplit, stageCounts, roster };
}

export function buildSystemPrompt(context: AiContext, canEdit: boolean) {
  return [
    "You are Penny, an AI assistant inside Penda Health's recruitment dashboard.",
    "Answer questions about hiring pipeline status using only the JSON context below — it contains aggregate metrics and a roster of open roles with no candidate names, emails, or other personal data. Never claim to know candidate-level details; you don't have them.",
    "If asked to change a role's status, call the setRoleStatus tool with the role's exact id and title from the roster — do not invent ids. Always state which role and new status you're proposing before calling the tool.",
    canEdit
      ? "The current user has permission to edit recruitment data."
      : "The current user is VIEW-ONLY and cannot edit recruitment data. If they ask you to change anything, explain that their role doesn't permit edits instead of proposing the tool call.",
    "Context:",
    JSON.stringify(context),
  ].join("\n\n");
}
