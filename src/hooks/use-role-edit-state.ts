"use client";

import * as React from "react";
import { Branch, OpenRole } from "@/types";
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
  const { updateOpenRole, createOpenRole, branches, canEdit, canManageRoles } = useRecruitmentData();

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

  // A "group" role's headcount is split across more than one branch at
  // once (location reads "Multiple Locations") — closing one of its gaps
  // shouldn't just bump the shared HC Filled counter, because that loses
  // *which* branch got filled. Instead the UI should prompt for a branch
  // (see CloseGroupGapDialog) and call closeGroupGap below.
  const isGroupRole = (role?.branchIds?.length ?? 0) > 1;
  // Every branch the seat could plausibly have been filled at — not just
  // the ones this record happens to be linked to. A "Multiple Locations"
  // posting on the Open Roles Register can be filled anywhere in the
  // network, not only at the branches it was originally split across, so
  // the picker offers the full active list (segment-scoped), with this
  // role's own linked branches surfaced first for convenience.
  const groupBranches: Branch[] = React.useMemo(() => {
    if (!role) return [];
    const linkedIds = new Set(role.branchIds ?? []);
    const active = branches.filter((b) => b.active && b.segment === role.segment);
    const linked = active.filter((b) => linkedIds.has(b.id)).sort((a, b) => a.name.localeCompare(b.name));
    const rest = active.filter((b) => !linkedIds.has(b.id)).sort((a, b) => a.name.localeCompare(b.name));
    return [...linked, ...rest];
  }, [role, branches]);

  /**
   * Carves one branch's seat out of a group role: creates a new
   * single-branch role for it (Filled, HC = amount), and shrinks the
   * group role's branch list / approved headcount by the same amount —
   * mirroring the manual per-branch split the register already supports
   * (see the Branch Manager · Kinoo/G44 cleanup). The group's own HC
   * Filled is left untouched — the fill now lives on the split-off role,
   * not on the shared counter.
   */
  async function closeGroupGap(branchId: string, amount: number) {
    if (!role || !canEdit || !isGroupRole) return;
    const branch = branches.find((b) => b.id === branchId);
    if (!branch) return;

    const remainingIds = (role.branchIds ?? []).filter((id) => id !== branchId);
    const remainingBranches = branches.filter((b) => remainingIds.includes(b.id));
    const newApproved = Math.max(0, roundToHalf(role.hcApproved - amount));
    const now = new Date().toISOString();

    await createOpenRole({
      id: "",
      roleId: "",
      title: role.title,
      segment: role.segment,
      department: role.department,
      location: branch.name,
      branchId: branch.id,
      branchIds: [branch.id],
      priority: role.priority,
      status: "Filled",
      hcApproved: amount,
      hcFilled: amount,
      recruiter: role.recruiter,
      hiringManager: branch.branchManager || role.hiringManager,
      hiringManagerEmail: role.hiringManagerEmail,
      datePosted: role.datePosted,
      dateClosed: now,
      employmentType: role.employmentType,
      cadre: role.cadre,
      notes: `Split from "${role.title}" (${role.roleId}, Multiple Locations) — ${branch.name} seat filled.`,
    });

    updateOpenRole(role.id, {
      branchIds: remainingIds,
      branchId: remainingIds[0],
      location:
        remainingBranches.length === 1
          ? remainingBranches[0].name
          : remainingBranches.length === 0
            ? role.location
            : "Multiple Locations",
      hcApproved: newApproved,
      status: newApproved <= 0 ? "Filled" : role.status,
      ...(newApproved <= 0 ? { dateClosed: now } : {}),
    });
  }

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
    isGroupRole,
    groupBranches,
    closeGroupGap,
  };
}
