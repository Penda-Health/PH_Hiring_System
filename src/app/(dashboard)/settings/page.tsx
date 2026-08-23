"use client";

import * as React from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { listAllProfiles, updateUserRoleAndBranch } from "@/lib/supabase/profiles";
import { DeletedItem, describeSnapshot, listRecentDeletedItems } from "@/lib/supabase/deleted-items-history";
import { Branch, USER_ROLE_LABELS, User, UserRoleName } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronRight, Check, Minus } from "lucide-react";
import { NewBranchDialog } from "@/components/branches/new-branch-dialog";
import { EditBranchDialog } from "@/components/branches/edit-branch-dialog";

const ROLES: UserRoleName[] = ["recruitment_manager", "recruitment_user", "contributor", "branch_manager"];
const DELETED_ITEMS_WINDOW_DAYS = 7;

function formatDeletedAt(iso: string): string {
  return new Date(iso).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" });
}

function DeletedItemRow({ item }: { item: DeletedItem }) {
  const [expanded, setExpanded] = React.useState(false);
  return (
    <div className="border-b py-2.5 last:border-b-0">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-3 text-left"
      >
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        )}
        <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {item.resource}
        </span>
        <span className="flex-1 min-w-0 truncate text-sm font-medium">
          {describeSnapshot(item.snapshot, item.recordId)}
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {formatDeletedAt(item.deletedAt)}
          {item.deletedByName ? ` · ${item.deletedByName}` : ""}
        </span>
      </button>
      {expanded && (
        <pre className="mt-2 ml-6 max-h-64 overflow-auto rounded-md bg-muted/60 p-3 text-xs">
          {JSON.stringify(item.snapshot, null, 2)}
        </pre>
      )}
    </div>
  );
}

function UserRow({ target, branches, onSaved }: { target: User; branches: { id: string; name: string }[]; onSaved: () => void }) {
  const [role, setRole] = React.useState<UserRoleName>(target.role);
  const [branchId, setBranchId] = React.useState<string>(target.branchId ?? "");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const dirty = role !== target.role || branchId !== (target.branchId ?? "");

  async function handleSave() {
    setSaving(true);
    setError(null);
    const ok = window.confirm(
      `Changing this user's role will immediately affect what they can see and do in the system. Continue?`
    );
    if (!ok) {
      setSaving(false);
      return;
    }
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setError("Supabase isn't configured.");
      setSaving(false);
      return;
    }
    const result = await updateUserRoleAndBranch(supabase, target.id, {
      role,
      branchId: role === "branch_manager" ? branchId || null : null,
    });
    if (!result.ok) {
      setError(result.error ?? "Failed to save");
    } else {
      onSaved();
    }
    setSaving(false);
  }

  return (
    <div className="flex items-center gap-3 border-b py-3 last:border-b-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight truncate">{target.name}</p>
        <p className="text-xs text-muted-foreground leading-tight truncate">{target.email}</p>
      </div>
      <Select value={role} onValueChange={(v) => setRole(v as UserRoleName)}>
        <SelectTrigger className="w-48">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ROLES.map((r) => (
            <SelectItem key={r} value={r}>
              {USER_ROLE_LABELS[r]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {role === "branch_manager" && (
        <Select value={branchId} onValueChange={setBranchId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Branch" />
          </SelectTrigger>
          <SelectContent>
            {branches.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <Button size="sm" disabled={!dirty || saving} onClick={handleSave} className="bg-penda-blue hover:bg-penda-blue-dark">
        {saving ? "Saving…" : "Save"}
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// Compact ✓/— indicator for a branch's checkbox fields — a blank/unset
// checkbox reads as unchecked (see SETUP.md 4.9), so making the current
// state visible at a glance, without opening the edit dialog, is the point.
function FlagIcon({ on }: { on: boolean }) {
  return on ? (
    <Check className="h-3.5 w-3.5 text-emerald-600" />
  ) : (
    <Minus className="h-3.5 w-3.5 text-muted-foreground/40" />
  );
}

function BranchRow({ branch, onSave }: { branch: Branch; onSave: (id: string, patch: Partial<Branch>) => void }) {
  return (
    <div className="flex items-center gap-3 border-b py-2.5 last:border-b-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-tight truncate">{branch.name || "(unnamed)"}</p>
        <p className="text-xs text-muted-foreground leading-tight truncate">
          {branch.branchId} · {branch.city || "—"} · {branch.segment}
        </p>
      </div>
      <div className="hidden sm:flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1" title="Active"><FlagIcon on={branch.active} />Active</span>
        <span className="flex items-center gap-1" title="Work Trial Active"><FlagIcon on={branch.workTrialActive} />Work Trial</span>
        <span className="flex items-center gap-1" title="Expansion Branch"><FlagIcon on={!!branch.expansionBranch} />Expansion</span>
      </div>
      <span className="w-12 shrink-0 text-right text-xs text-muted-foreground">{branch.capacity} cap</span>
      <EditBranchDialog branch={branch} onSave={onSave} />
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { branches, createBranch, updateBranch } = useRecruitmentData();
  const [profiles, setProfiles] = React.useState<User[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [deletedItems, setDeletedItems] = React.useState<DeletedItem[]>([]);
  const [deletedItemsLoading, setDeletedItemsLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setLoading(false);
      setDeletedItemsLoading(false);
      return;
    }
    setProfiles(await listAllProfiles(supabase));
    setLoading(false);
    setDeletedItems(await listRecentDeletedItems(supabase, DELETED_ITEMS_WINDOW_DAYS));
    setDeletedItemsLoading(false);
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  if (user?.role !== "recruitment_manager") {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Only Recruitment Managers can access Settings.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Users &amp; roles</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : profiles.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No profiles found. This needs the Supabase `profiles` table set up — see SETUP.md section 4.6.
            </p>
          ) : (
            profiles.map((p) => (
              <UserRow key={p.id} target={p} branches={branches.map((b) => ({ id: b.id, name: b.name }))} onSaved={load} />
            ))
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle>Branches</CardTitle>
          <NewBranchDialog branches={branches} onCreate={createBranch} />
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-muted-foreground">
            A blank Active / Work Trial Active / Expansion Branch checkbox reads as unchecked and silently hides a
            branch from every branch-filtered view (this is what happened to Kinoo) — check here if a branch seems
            to be missing somewhere.
          </p>
          {branches.length === 0 ? (
            <p className="text-sm text-muted-foreground">No branches yet.</p>
          ) : (
            [...branches]
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((b) => <BranchRow key={b.id} branch={b} onSave={updateBranch} />)
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Deleted items</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-muted-foreground">
            Every hard delete across the app (past the 30-second &ldquo;Undo&rdquo; toast) lands here for{" "}
            {DELETED_ITEMS_WINDOW_DAYS} days — recruitment_manager only. Expand a row to see the full record and
            re-create it via the relevant page if it was deleted in error.
          </p>
          {deletedItemsLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : deletedItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing deleted in the last {DELETED_ITEMS_WINDOW_DAYS} days. This needs the Supabase `deleted_items`
              table set up — see SETUP.md section 4.8.
            </p>
          ) : (
            deletedItems.map((item) => <DeletedItemRow key={item.id} item={item} />)
          )}
        </CardContent>
      </Card>
    </div>
  );
}
