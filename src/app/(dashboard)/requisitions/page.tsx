"use client";

import * as React from "react";
import Link from "next/link";
import { Plus, Search, X } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RequisitionTable } from "@/components/requisitions/requisition-table";
import { NewRequisitionDialog } from "@/components/requisitions/new-requisition-dialog";
import { CopyPublicLinkMenu } from "@/components/requisitions/copy-public-link-menu";
import {
  buildRows,
  compareRows,
  DEFAULT_REQUISITION_FILTERS,
  matchesFilters,
  matchesView,
  RequisitionFilterState,
  RequisitionView,
  VIEW_LABELS,
} from "@/lib/requisitions/list-view";
import { Priority, Segment } from "@/types";
import { cn } from "@/lib/utils";

const VIEWS: RequisitionView[] = ["active", "mine", "pending", "hiring", "closed", "all"];
const URGENCIES: Priority[] = ["Critical", "High", "Medium", "Low"];
const SEGMENTS: Segment[] = ["IPS", "SO"];

export default function RequisitionsPage() {
  const { user } = useAuth();
  const {
    requisitions,
    openRoles,
    branches,
    createRequisition,
    decideRequisition,
    resendRequisitionApproval,
    canEdit,
    extendedLoading,
  } = useRecruitmentData();
  const [filters, setFilters] = React.useState<RequisitionFilterState>(DEFAULT_REQUISITION_FILTERS);
  const [newDialogOpen, setNewDialogOpen] = React.useState(false);

  const allRows = React.useMemo(() => buildRows(requisitions, openRoles, user ?? null), [requisitions, openRoles, user]);
  const filteredRows = React.useMemo(
    () => allRows.filter((r) => matchesFilters(r, filters, branches)),
    [allRows, filters, branches]
  );
  const counts = React.useMemo(() => {
    const c = {} as Record<RequisitionView, number>;
    for (const v of VIEWS) c[v] = filteredRows.filter((r) => matchesView(r, v)).length;
    return c;
  }, [filteredRows]);
  const rows = React.useMemo(
    () => filteredRows.filter((r) => matchesView(r, filters.view)).sort(compareRows),
    [filteredRows, filters.view]
  );

  const branchOptions = React.useMemo(() => {
    const used = new Set(requisitions.map((r) => r.branchId).filter(Boolean));
    return branches
      .filter((b) => used.has(b.id) && (filters.segment === "All" || b.segment === filters.segment))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [branches, requisitions, filters.segment]);

  const narrowed =
    filters.search.trim() !== "" || filters.segment !== "All" || filters.branchId !== "All" || filters.urgency !== "All";
  const set = (patch: Partial<RequisitionFilterState>) => setFilters((f) => ({ ...f, ...patch }));

  // "Waiting on me" only makes sense to someone who approves things.
  const views = VIEWS.filter((v) => v !== "mine" || counts.mine > 0 || filters.view === "mine");
  const closedHidden = filters.view === "active" ? counts.closed : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Requisition Intake</h1>
          {extendedLoading && <span className="text-xs text-muted-foreground animate-pulse">Loading…</span>}
        </div>
        <div className="flex items-center gap-2">
          {canEdit && <CopyPublicLinkMenu />}
          {/* Non-modal so "Quick add…" can open its dialog without Radix leaving the page click-locked. */}
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button className="bg-penda-blue hover:bg-penda-blue-dark">
                <Plus className="h-4 w-4 mr-1.5" />
                New requisition
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href="/requisitions/new/ips">IPS gap form</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/requisitions/new/so">SO requisition form</Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setNewDialogOpen(true)}>Quick add…</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <NewRequisitionDialog
            onCreate={createRequisition}
            submittedBy={user?.name ?? "Unknown"}
            branches={branches}
            open={newDialogOpen}
            onOpenChange={setNewDialogOpen}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b">
        {views.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => set({ view: v })}
            className={cn(
              "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm transition-colors",
              filters.view === v
                ? "border-penda-blue text-foreground font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {VIEW_LABELS[v]}
            <span
              className={cn(
                "rounded-full px-1.5 text-xs tabular-nums",
                v === "mine" && counts.mine > 0 ? "bg-penda-blue text-white" : "bg-muted text-muted-foreground"
              )}
            >
              {counts[v]}
            </span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={filters.search}
            onChange={(e) => set({ search: e.target.value })}
            placeholder="Search role, req ID, requester…"
            className="pl-8"
          />
        </div>
        <Select value={filters.segment} onValueChange={(v) => set({ segment: v as "All" | Segment, branchId: "All" })}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All segments</SelectItem>
            {SEGMENTS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.branchId} onValueChange={(v) => set({ branchId: v })}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">All branches</SelectItem>
            {branchOptions.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filters.urgency} onValueChange={(v) => set({ urgency: v as "All" | Priority })}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">Any urgency</SelectItem>
            {URGENCIES.map((u) => (
              <SelectItem key={u} value={u}>
                {u}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {narrowed && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilters((f) => ({ ...DEFAULT_REQUISITION_FILTERS, view: f.view }))}
          >
            <X className="h-4 w-4 mr-1" />
            Clear filters
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <RequisitionTable
            rows={rows}
            branches={branches}
            user={user ?? null}
            canEdit={canEdit}
            onDecide={decideRequisition}
            onResend={resendRequisitionApproval}
            emptyMessage={
              filters.view === "mine"
                ? "Nothing is waiting on you"
                : narrowed
                  ? "No requisitions match these filters"
                  : `No ${VIEW_LABELS[filters.view].toLowerCase()} requisitions`
            }
          />
        </CardContent>
      </Card>

      {closedHidden > 0 && (
        <p className="text-sm text-muted-foreground">
          {closedHidden} closed requisition{closedHidden === 1 ? "" : "s"} (rejected, or the role was filled or cancelled)
          hidden.{" "}
          <button type="button" className="text-penda-blue hover:underline" onClick={() => set({ view: "closed" })}>
            Show closed
          </button>
        </p>
      )}
    </div>
  );
}
