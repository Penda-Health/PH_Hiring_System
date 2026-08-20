"use client";

import Link from "next/link";
import { OpenRole, Requisition } from "@/types";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ReplacementStatusBadge } from "./replacement-status-badge";

// A requisition is "eligible" to link as this role's backfill if it's the
// kind an internal move creates (a gap, not a brand-new headcount) and
// isn't already claimed by some other internally-filled role.
function eligibleRequisitions(role: OpenRole, requisitions: Requisition[], openRoles: OpenRole[]): Requisition[] {
  const linkedElsewhere = new Set(
    openRoles.filter((r) => r.id !== role.id && r.replacementRequisitionId).map((r) => r.replacementRequisitionId)
  );
  return requisitions.filter(
    (req) =>
      (req.type === "IPS Gap" || req.type === "SO Replacement") &&
      (req.gapReason === "Transfer" || req.gapReason === "Promotion" || req.reasonType === "Internal Promotion") &&
      !linkedElsewhere.has(req.id)
  );
}

/**
 * Shown inline under the "Internally filled" toggle once it's checked —
 * lets a recruiter link the role to the Requisition raised to backfill the
 * seat this internal move vacated elsewhere, or jump straight to raising one.
 * Shared by RoleCandidatesDialog and RoleBreakdown so they can't drift.
 */
export function ReplacementRequisitionPicker({
  role,
  requisitions,
  openRoles,
  canEdit,
  onLink,
}: {
  role: OpenRole;
  requisitions: Requisition[];
  openRoles: OpenRole[];
  canEdit: boolean;
  onLink: (requisitionId: string | undefined) => void;
}) {
  const eligible = eligibleRequisitions(role, requisitions, openRoles);
  const newReqHref =
    role.segment === "IPS"
      ? `/requisitions/new/ips?linkRoleId=${role.id}&gapReason=Transfer`
      : `/requisitions/new/so?linkRoleId=${role.id}`;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs text-muted-foreground">Replacement for the seat this vacated</Label>
        <ReplacementStatusBadge role={role} requisitions={requisitions} openRoles={openRoles} />
      </div>
      <Select
        value={role.replacementRequisitionId ?? "__none"}
        onValueChange={(v) => onLink(v === "__none" ? undefined : v)}
        disabled={!canEdit}
      >
        <SelectTrigger className="text-sm h-8">
          <SelectValue placeholder="Not yet raised" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none">Not yet raised</SelectItem>
          {eligible.map((req) => (
            <SelectItem key={req.id} value={req.id}>
              {req.roleTitle} · {req.department} ({req.status})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {canEdit && !role.replacementRequisitionId && (
        <Link href={newReqHref} className="text-xs text-penda-blue hover:underline">
          + Raise the replacement requisition
        </Link>
      )}
    </div>
  );
}
