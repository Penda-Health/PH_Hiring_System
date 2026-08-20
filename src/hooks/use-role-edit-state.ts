"use client";

import * as React from "react";
import { OpenRole } from "@/types";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";

/**
 * Shared editable-state logic for a role's notes / internal-fill / headcount
 * fields — used by both RoleBreakdown (pipeline tab) and RoleCandidatesDialog
 * (roles table dialog), which used to duplicate this state, its sync effects,
 * and its save handlers verbatim. `role` may be null (RoleCandidatesDialog
 * renders while closed, before a role is selected) — all savers become
 * no-ops until a role is present.
 */
// Shared by every +/- HC stepper (RoleCandidatesDialog, RoleBreakdown) so
// they can't drift apart on step size.
export const HC_STEP = 0.5;

/** "2" for a whole number, "1.5" for a half — never a trailing ".0". */
export function formatHc(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export function useRoleEditState(role: OpenRole | null) {
  const { updateOpenRole, canEdit, canManageRoles } = useRecruitmentData();

  const [title, setTitle] = React.useState(role?.title ?? "");
  const [notes, setNotes] = React.useState(role?.notes ?? "");
  const [internalFill, setInternalFill] = React.useState(role?.internalFill ?? false);
  const [internalFillName, setInternalFillName] = React.useState(role?.internalFillName ?? "");
  const [localHcFilled, setLocalHcFilled] = React.useState(role?.hcFilled ?? 0);
  const [localHcApproved, setLocalHcApproved] = React.useState(role?.hcApproved ?? 1);

  // Reset text/checkbox fields when a different role is selected/opened
  React.useEffect(() => {
    setTitle(role?.title ?? "");
    setNotes(role?.notes ?? "");
    setInternalFill(role?.internalFill ?? false);
    setInternalFillName(role?.internalFillName ?? "");
  }, [role?.id]);

  // Sync HC counts whenever Airtable pushes back an update (via polling/focus refresh)
  React.useEffect(() => { setLocalHcFilled(role?.hcFilled ?? 0); }, [role?.hcFilled]);
  React.useEffect(() => { setLocalHcApproved(role?.hcApproved ?? 1); }, [role?.hcApproved]);

  // Some roles are split across two clustered branches, so a single branch's
  // slice of the headcount can be a half (0.5) rather than a whole number —
  // round to the nearest half to guard against any stray floating-point
  // drift from repeated +/- 0.5 stepping.
  const roundToHalf = (n: number) => Math.round(n * 2) / 2;

  function applyHcChange(newFilled: number, newApproved: number) {
    if (!role || !canEdit) return;
    const approved = Math.max(0.5, roundToHalf(newApproved));
    const filled = Math.max(0, Math.min(roundToHalf(newFilled), approved));
    setLocalHcFilled(filled);
    setLocalHcApproved(approved);
    const newStatus: OpenRole["status"] =
      filled >= approved ? "Filled" : role.status === "Filled" ? "Open" : role.status;
    updateOpenRole(role.id, {
      hcFilled: filled,
      hcApproved: approved,
      status: newStatus,
      ...(newStatus === "Filled" ? { dateClosed: new Date().toISOString() } : {}),
      ...(newStatus !== "Filled" && role.status === "Filled" ? { dateClosed: null } : {}),
    });
  }

  function setHcFilled(n: number) { applyHcChange(n, localHcApproved); }
  function setHcApproved(n: number) { applyHcChange(localHcFilled, n); }

  function saveTitle() {
    if (!role || !canManageRoles) return;
    const trimmed = title.trim();
    if (!trimmed || trimmed === role.title) return;
    updateOpenRole(role.id, { title: trimmed });
  }

  function saveNotes() {
    if (!role || !canEdit) return;
    const trimmed = notes.trim();
    if (trimmed === (role.notes ?? "")) return;
    updateOpenRole(role.id, { notes: trimmed || undefined });
  }

  function handleInternalFillToggle(checked: boolean) {
    if (!role || !canEdit) return;
    setInternalFill(checked);
    updateOpenRole(role.id, { internalFill: checked, internalFillName: checked ? internalFillName : undefined });
  }

  function saveInternalFillName() {
    if (!role || !canEdit || !internalFill) return;
    const trimmed = internalFillName.trim();
    if (trimmed === (role.internalFillName ?? "")) return;
    updateOpenRole(role.id, { internalFillName: trimmed || undefined });
  }

  // Links this internally-filled role to the Requisition raised to backfill
  // the seat it vacated elsewhere — saves immediately (a select, not a
  // text field, so no blur-to-save debounce needed like the fields above).
  function linkReplacementRequisition(requisitionId: string | undefined) {
    if (!role || !canEdit) return;
    updateOpenRole(role.id, { replacementRequisitionId: requisitionId });
  }

  return {
    canEdit,
    canManageRoles,
    title,
    setTitle,
    saveTitle,
    notes,
    setNotes,
    saveNotes,
    internalFill,
    internalFillName,
    setInternalFillName,
    handleInternalFillToggle,
    saveInternalFillName,
    linkReplacementRequisition,
    localHcFilled,
    localHcApproved,
    setHcFilled,
    setHcApproved,
  };
}
