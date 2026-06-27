"use client";

import * as React from "react";
import { Share2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Branch, OpenRole } from "@/types";
import { IpsAllocation, IpsMeeting, IpsMeetingNote } from "@/lib/supabase/ips-meetings";
import { IpsRoleGroup } from "@/lib/ips-role-groups";

export type IpsViewMode = "role" | "branch" | "priority";

function statusEmoji(allocation: IpsAllocation): string {
  if (allocation.candidateId) return "✅";
  if (allocation.priority === "Critical") return "🔴";
  return "⚠️";
}

export function formatWhatsAppSummary(
  meeting: IpsMeeting,
  allocations: IpsAllocation[],
  notes: IpsMeetingNote[],
  view: IpsViewMode,
  roleById: Map<string, OpenRole>,
  branchById: Map<string, Branch>
): string {
  const total = allocations.length;
  const filled = allocations.filter((a) => a.candidateId).length;
  const lines: string[] = [];

  lines.push(`*IPS Meeting Board — ${meeting.meetingDate}*`);
  lines.push(`${filled}/${total} slots filled`);
  lines.push("");

  function allocationLine(a: IpsAllocation): string {
    const title = roleById.get(a.openRoleId)?.title ?? a.openRoleId;
    const candidateName = a.candidateId ? "filled" : "UNFILLED";
    const suffix = a.candidateId ? "" : ` (${a.priority})`;
    return `- ${statusEmoji(a)} ${title} – ${candidateName}${suffix}`;
  }

  if (view === "branch") {
    const branchIds = Array.from(new Set(allocations.map((a) => a.branchId)));
    for (const branchId of branchIds) {
      const branchName = branchById.get(branchId)?.name ?? branchId;
      lines.push(`*${branchName}*`);
      allocations.filter((a) => a.branchId === branchId).forEach((a) => lines.push(allocationLine(a)));
      lines.push("");
    }
  } else if (view === "priority") {
    lines.push("*Critical & High priority, unfilled*");
    allocations
      .filter((a) => !a.candidateId && (a.priority === "Critical" || a.priority === "High"))
      .forEach((a) => lines.push(allocationLine(a)));
    lines.push("");
  } else {
    const groups = Array.from(new Set(allocations.map((a) => a.roleGroup))) as IpsRoleGroup[];
    for (const group of groups) {
      lines.push(`*${group}*`);
      allocations.filter((a) => a.roleGroup === group).forEach((a) => lines.push(allocationLine(a)));
      lines.push("");
    }
  }

  const openNotes = notes.filter((n) => !n.resolved && (n.noteType === "Action" || n.noteType === "Risk"));
  if (openNotes.length > 0) {
    lines.push("*Open action items / risks*");
    openNotes.forEach((n) => lines.push(`- ${n.noteType === "Risk" ? "🔴" : "⚠️"} ${n.body}`));
  }

  return lines.join("\n").trim();
}

export function ShareSummaryButton({
  meeting,
  allocations,
  notes,
  view,
  roleById,
  branchById,
}: {
  meeting: IpsMeeting;
  allocations: IpsAllocation[];
  notes: IpsMeetingNote[];
  view: IpsViewMode;
  roleById: Map<string, OpenRole>;
  branchById: Map<string, Branch>;
}) {
  const [copied, setCopied] = React.useState(false);

  async function handleShare() {
    const text = formatWhatsAppSummary(meeting, allocations, notes, view, roleById, branchById);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button variant="outline" size="sm" onClick={handleShare}>
      {copied ? <Check className="h-4 w-4 mr-1.5" /> : <Share2 className="h-4 w-4 mr-1.5" />}
      {copied ? "Copied" : "Share summary"}
    </Button>
  );
}
