// Server-only. Closes the loop on a requisition's Google Chat thread: when
// the Open Role it became is Filled or Cancelled (or reopened afterwards,
// e.g. a hire who didn't join), post that to the same thread the request
// and its approvals went to, with how long the role took to close.
// Called from PATCH /api/open-roles/[id], which every status change in the
// app goes through (manual status changes and the auto-"Filled" on hire).
import { getRecord, listRecords } from "@/lib/airtable/client";
import { TABLE_NAMES } from "@/lib/airtable/field-names";
import { candidateFromAirtable, requisitionFromAirtable } from "@/lib/airtable/mappers";
import { postToGoogleChat } from "@/lib/notifications/google-chat";
import { loadApprovalSettings, requisitionThreadKey } from "@/lib/requisitions/approval";
import { OpenRole } from "@/types";

const CLOSED_STATUSES = new Set<OpenRole["status"]>(["Filled", "Cancelled"]);

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days between two dates (date-only or ISO), never negative. */
function daysBetween(from: string | undefined, to: Date): number | null {
  if (!from) return null;
  const start = new Date(from.length === 10 ? `${from}T00:00:00` : from);
  if (Number.isNaN(start.getTime())) return null;
  return Math.max(0, Math.round((to.getTime() - start.getTime()) / DAY_MS));
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/**
 * Best-effort, never throws — a chat message is a side effect of the status
 * change, not a reason to fail it. Only roles created from a requisition have
 * a thread to reply to; anything else is skipped.
 */
export async function notifyRoleStatusChange(before: OpenRole, after: OpenRole, actorName?: string): Promise<void> {
  try {
    if (before.status === after.status || !after.requisitionId) return;
    const closing = CLOSED_STATUSES.has(after.status) && !CLOSED_STATUSES.has(before.status);
    const reopening = CLOSED_STATUSES.has(before.status) && !CLOSED_STATUSES.has(after.status);
    if (!closing && !reopening) return;

    const [{ chatWebhookUrl }, reqRecord] = await Promise.all([
      loadApprovalSettings(),
      getRecord(TABLE_NAMES.Requisitions, after.requisitionId),
    ]);
    if (!chatWebhookUrl) return;
    const req = reqRecord ? requisitionFromAirtable(reqRecord) : null;
    const role = `*${after.roleId}* (${after.title} ×${after.hcApproved}, ${after.location})`;
    const by = actorName ? ` by ${actorName}` : "";

    let text: string;
    if (closing) {
      const closedAt = after.dateClosed ? new Date(after.dateClosed) : new Date();
      const openDays = daysBetween(after.datePosted, closedAt);
      const requestDays = daysBetween(req?.submittedAt, closedAt);
      const fromRequest = requestDays !== null && req ? `${plural(requestDays, "day")} from request ${req.reqId}` : null;
      const timing = (lead: string) =>
        openDays === null ? (fromRequest ? `\n⏱️ ${fromRequest}` : "") : `\n⏱️ ${lead} ${plural(openDays, "day")}${fromRequest ? ` (${fromRequest})` : ""}`;

      if (after.status === "Filled") {
        const hires = (await listRecords(TABLE_NAMES.Candidates))
          .map(candidateFromAirtable)
          .filter((c) => c.roleId === after.id && c.stage === "Hired")
          .map((c) => c.name);
        text =
          `🏁 ${role} *filled*${by}` +
          timing("Filled in") +
          (hires.length ? `\nHired: ${hires.join(", ")}` : "");
      } else {
        text = `🚫 ${role} *cancelled*${by}` + timing("Was open for");
      }
    } else {
      text = `▶️ ${role} *reopened*${by} — now ${after.status}, ${after.hcFilled}/${after.hcApproved} filled.`;
    }

    await postToGoogleChat(chatWebhookUrl, text, requisitionThreadKey(after.requisitionId));
  } catch (err) {
    console.error("[role-notifications] failed:", err);
  }
}
