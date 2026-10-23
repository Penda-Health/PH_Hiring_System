// One row per role for "where are our open roles at" reporting. Shared by
// the IPS weekly Google Chat summary, the downloadable roles report and
// Penny's context, so all three quote the same numbers. Pure: no Airtable or
// React, safe on both server and client.
import { Candidate, CandidateStage, OpenRole, Priority, RoleStatus, RoleUpdate, Segment } from "@/types";
import { ACTIVE_CANDIDATE_STAGE_EXCLUSIONS } from "@/lib/roles-helpers";

const DAY_MS = 86_400_000;

// Furthest-along stage first, so the pipeline line reads as "how close are we".
const PIPELINE_STAGE_ORDER: CandidateStage[] = [
  "Offer",
  "Reference Check",
  "Work Trial",
  "Panel Interview",
  "Second Interview",
  "First Interview",
  "Backup Pool",
];

const PRIORITY_ORDER: Priority[] = ["Critical", "High", "Medium", "Low"];

export interface RoleSummaryRow {
  id: string;
  roleId: string;
  title: string;
  segment: Segment;
  department: string;
  location: string;
  priority: Priority;
  status: RoleStatus;
  recruiter: string;
  hcApproved: number;
  hcFilled: number;
  hcOpen: number;
  datePosted: string | null;
  dateClosed: string | null;
  daysOpen: number | null;
  pipelineTotal: number;
  /** Active candidates per stage, furthest-along stage first. */
  pipelineByStage: { stage: CandidateStage; count: number }[];
  /** Newest first. */
  updates: RoleUpdate[];
}

export interface RoleSummaryFilters {
  segments?: Segment[];
  statuses?: RoleStatus[];
  priorities?: Priority[];
  departments?: string[];
  locations?: string[];
  recruiters?: string[];
  /** Inclusive YYYY-MM-DD bounds on the posted date. */
  postedFrom?: string;
  postedTo?: string;
}

function validDate(value: string | null | undefined): string | null {
  return value && !isNaN(new Date(value).getTime()) ? value : null;
}

export function buildRoleSummaryRows(
  roles: OpenRole[],
  candidates: Candidate[],
  updates: RoleUpdate[],
  now: Date = new Date()
): RoleSummaryRow[] {
  const activeByRole = new Map<string, Candidate[]>();
  for (const c of candidates) {
    if (!c.roleId || ACTIVE_CANDIDATE_STAGE_EXCLUSIONS.has(c.stage)) continue;
    activeByRole.set(c.roleId, [...(activeByRole.get(c.roleId) ?? []), c]);
  }
  const updatesByRole = new Map<string, RoleUpdate[]>();
  for (const u of updates) updatesByRole.set(u.roleId, [...(updatesByRole.get(u.roleId) ?? []), u]);

  return roles.map((r) => {
    const active = activeByRole.get(r.id) ?? [];
    const posted = validDate(r.datePosted);
    const closed = validDate(r.dateClosed);
    const end = closed && r.status !== "Open" ? new Date(closed) : now;
    return {
      id: r.id,
      roleId: r.roleId,
      title: r.title,
      segment: r.segment,
      department: r.department,
      location: r.location,
      priority: r.priority,
      status: r.status,
      recruiter: r.recruiter,
      hcApproved: r.hcApproved,
      hcFilled: r.hcFilled,
      hcOpen: Math.max(0, r.hcApproved - r.hcFilled),
      datePosted: posted,
      dateClosed: closed,
      daysOpen: posted ? Math.max(0, Math.floor((end.getTime() - new Date(posted).getTime()) / DAY_MS)) : null,
      pipelineTotal: active.length,
      pipelineByStage: PIPELINE_STAGE_ORDER.map((stage) => ({
        stage,
        count: active.filter((c) => c.stage === stage).length,
      })).filter((s) => s.count > 0),
      updates: [...(updatesByRole.get(r.id) ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    };
  });
}

export function filterRoleSummaryRows(rows: RoleSummaryRow[], f: RoleSummaryFilters): RoleSummaryRow[] {
  const has = <T,>(list: T[] | undefined, value: T) => !list || list.length === 0 || list.includes(value);
  return rows.filter(
    (r) =>
      has(f.segments, r.segment) &&
      has(f.statuses, r.status) &&
      has(f.priorities, r.priority) &&
      has(f.departments, r.department) &&
      has(f.locations, r.location) &&
      has(f.recruiters, r.recruiter || "Unassigned") &&
      (!f.postedFrom || (r.datePosted !== null && r.datePosted.slice(0, 10) >= f.postedFrom)) &&
      (!f.postedTo || (r.datePosted !== null && r.datePosted.slice(0, 10) <= f.postedTo))
  );
}

/** Priority first, then the roles that have waited longest. */
export function sortRoleSummaryRows(rows: RoleSummaryRow[]): RoleSummaryRow[] {
  return [...rows].sort(
    (a, b) =>
      PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority) ||
      (b.daysOpen ?? -1) - (a.daysOpen ?? -1) ||
      a.title.localeCompare(b.title)
  );
}

export function formatHeadcount(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function formatPipeline(row: RoleSummaryRow): string {
  return row.pipelineByStage.length === 0
    ? "No active candidates"
    : row.pipelineByStage.map((s) => `${s.count} ${s.stage}`).join(", ");
}

export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Africa/Nairobi" });
}

export function updatesSince(row: RoleSummaryRow, since: Date): RoleUpdate[] {
  return row.updates.filter((u) => new Date(u.createdAt) >= since);
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

// ── IPS weekly Google Chat summary ─────────────────────────────────────────

// Google Chat rejects message text over 4,096 characters, so long weeks are
// split across several messages in the same thread.
const CHAT_MESSAGE_LIMIT = 3800;

/**
 * Builds the weekly IPS open-roles message(s). Deterministic — every figure
 * comes straight from the data, so it can be posted unattended.
 */
export function buildIpsWeeklySummaryMessages(allRows: RoleSummaryRow[], now: Date = new Date()): string[] {
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
  const ips = allRows.filter((r) => r.segment === "IPS");
  const open = sortRoleSummaryRows(ips.filter((r) => r.status === "Open"));
  const newThisWeek = open.filter((r) => r.datePosted && new Date(r.datePosted) >= weekAgo);
  const closedThisWeek = ips.filter(
    (r) => r.status !== "Open" && r.dateClosed && new Date(r.dateClosed) >= weekAgo
  );
  const hcGap = open.reduce((sum, r) => sum + r.hcOpen, 0);
  const inPipeline = open.reduce((sum, r) => sum + r.pipelineTotal, 0);
  const noUpdate = open.filter((r) => updatesSince(r, weekAgo).length === 0);

  const header = [
    `*IPS Open Roles — Weekly Update (${formatShortDate(now.toISOString())})*`,
    `Open roles: *${open.length}* · Headcount gap: *${formatHeadcount(hcGap)}* · Candidates in pipeline: *${inPipeline}*`,
    `New this week: ${newThisWeek.length} · Closed this week: ${closedThisWeek.length}` +
      (closedThisWeek.length ? ` (${closedThisWeek.map((r) => `${r.title} – ${r.location}`).join("; ")})` : ""),
    noUpdate.length ? `⚠️ ${noUpdate.length} open role${noUpdate.length === 1 ? "" : "s"} had no recruiter update this week.` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const blocks = open.map((r) => {
    const lines = [
      `• *${r.title}* — ${r.location || "No location"} · ${r.priority} priority`,
      `   ${formatHeadcount(r.hcOpen)} open of ${formatHeadcount(r.hcApproved)} · ${
        r.daysOpen === null ? "posted date unknown" : `${r.daysOpen} days open`
      } · Recruiter: ${r.recruiter || "Unassigned"}`,
      `   Pipeline: ${formatPipeline(r)}`,
    ];
    const recent = updatesSince(r, weekAgo);
    if (recent.length) {
      for (const u of recent.slice(0, 2)) {
        lines.push(`   ↳ _${u.authorName}, ${formatShortDate(u.createdAt)}:_ ${truncate(u.comment.replace(/\s+/g, " ").trim(), 400)}`);
      }
    } else {
      lines.push("   ↳ _No update this week_");
    }
    return lines.join("\n");
  });

  if (open.length === 0) return [`${header}\n\nNo open IPS roles right now. 🎉`];

  const messages: string[] = [];
  let current = header + "\n";
  for (const block of blocks) {
    if ((current + "\n" + block).length > CHAT_MESSAGE_LIMIT) {
      messages.push(current.trimEnd());
      current = "";
    }
    current += "\n" + block;
  }
  messages.push(current.trimEnd());
  return messages;
}
