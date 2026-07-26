"use client";

import * as React from "react";
import { WorkTrial } from "@/types";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";
import { WorkTrialCard } from "@/components/work-trials/work-trial-card";
import { NewWorkTrialDialog } from "@/components/work-trials/new-work-trial-dialog";
import { ScoreEntryDialog } from "@/components/work-trials/score-entry-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, Copy, LayoutList, Columns3, RefreshCw } from "lucide-react";
import { getDisplayStatus, getCandidateForTrial, getBranchForTrial } from "@/lib/work-trial-helpers";

type StatusFilter = "all" | "Awaiting Arrival" | "Awaiting Score" | "Complete";
type BookedFilter = "all" | "booked" | "not-booked";
type ViewMode = "kanban" | "list";

const STATUS_BADGE: Record<string, string> = {
  "Awaiting Arrival": "bg-muted text-muted-foreground border-transparent",
  "Awaiting Score":   "bg-high-bg text-high-fg border-transparent",
  "Complete":         "bg-penda-teal-light text-penda-teal-dark border-transparent",
};

async function getFormLink(body: Record<string, unknown>): Promise<string> {
  const res = await fetch("/api/forms/get-link", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to get link");
  }
  const { url } = await res.json();
  return url as string;
}

export default function WorkTrialsPage() {
  const {
    workTrials, candidates, branches, openRoles,
    createWorkTrial, updateWorkTrial, deleteWorkTrial, submitWorkTrialScores, canEdit,
  } = useRecruitmentData();

  const [view, setView] = React.useState<ViewMode>("kanban");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [bookedFilter, setBookedFilter] = React.useState<BookedFilter>("all");
  const [branchFilter, setBranchFilter] = React.useState("all");
  const [search, setSearch] = React.useState("");
  const [syncing, setSyncing] = React.useState(false);
  const [linkCopied, setLinkCopied] = React.useState(false);
  const [scoreDialogTrialId, setScoreDialogTrialId] = React.useState<string | null>(null);
  const [copiedLinkId, setCopiedLinkId] = React.useState<string | null>(null);
  const [linkError, setLinkError] = React.useState<string | null>(null);

  const unsynced = React.useMemo(() => {
    const linked = new Set(workTrials.map((t) => t.candidateId));
    return candidates.filter((c) => c.stage === "Work Trial" && !linked.has(c.id));
  }, [candidates, workTrials]);

  async function runSync() {
    if (syncing || unsynced.length === 0 || !canEdit) return;
    setSyncing(true);
    const now = new Date().toISOString();
    try {
      await Promise.all(
        unsynced.map((candidate) => {
          const linkedRole = openRoles.find((r) => r.id === candidate.roleId);
          const branch = branches.find((b) => b.name === linkedRole?.location);
          return createWorkTrial({
            id: `wt-${Date.now()}-${candidate.id}`,
            wtId: "",
            candidateId: candidate.id,
            roleId: candidate.roleId || undefined,
            branchId: branch?.id ?? "",
            date: now.slice(0, 10),
            supervisor: branch?.branchManager ?? "",
            createdAt: now,
            arrivalMarked: null,
            scoreTechnical: null,
            scorePatient: null,
            scoreSafety: null,
            scoreCulture: null,
            total: null,
            passFail: "Pending",
            formSubmittedAt: null,
            submittedByRole: null,
            bmApprovedAt: null,
            reminder12hSent: false,
            escalation24hSent: false,
          } as WorkTrial);
        })
      );
    } catch (err) {
      console.error("Failed to sync work trials:", err);
    } finally {
      setSyncing(false);
    }
  }

  const syncedRef = React.useRef(false);
  React.useEffect(() => {
    if (syncedRef.current || unsynced.length === 0 || !canEdit) return;
    syncedRef.current = true;
    runSync();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unsynced, canEdit]);

  function copySchedulingLink() {
    navigator.clipboard.writeText(`${window.location.origin}/work-trial-request`).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }

  async function copyBmLink(trial: WorkTrial) {
    setLinkError(null);
    try {
      const url = await getFormLink({ type: "bm-feedback", workTrialId: trial.id, candidateId: trial.candidateId });
      await navigator.clipboard.writeText(url);
      setCopiedLinkId(trial.id);
      setTimeout(() => setCopiedLinkId(null), 2000);
    } catch (err) {
      setLinkError(err instanceof Error ? err.message : "Failed to copy link");
      setTimeout(() => setLinkError(null), 4000);
    }
  }

  // Filtered list
  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return workTrials.filter((trial) => {
      const candidate = getCandidateForTrial(trial, candidates);
      const status = getDisplayStatus(trial);

      if (statusFilter !== "all" && status !== statusFilter) return false;
      const isBooked = Boolean(trial.branchId && trial.date);
      if (bookedFilter === "booked" && !isBooked) return false;
      if (bookedFilter === "not-booked" && isBooked) return false;
      if (branchFilter !== "all" && trial.branchId !== branchFilter) return false;
      if (q && !candidate?.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [workTrials, candidates, statusFilter, bookedFilter, branchFilter, search]);

  const statusCounts = React.useMemo(() => {
    const counts: Record<string, number> = { all: workTrials.length, "Awaiting Arrival": 0, "Awaiting Score": 0, "Complete": 0 };
    for (const t of workTrials) counts[getDisplayStatus(t)] = (counts[getDisplayStatus(t)] ?? 0) + 1;
    return counts;
  }, [workTrials]);

  const kanbanColumns: { status: StatusFilter; label: string }[] = [
    { status: "Awaiting Arrival", label: "Awaiting Arrival" },
    { status: "Awaiting Score",   label: "Awaiting Score" },
    { status: "Complete",         label: "Complete" },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-semibold">Work Trials</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={copySchedulingLink} className="gap-1.5">
            {linkCopied ? <Check className="h-3.5 w-3.5 text-penda-teal" /> : <Copy className="h-3.5 w-3.5" />}
            {linkCopied ? "Copied!" : "Candidate scheduling link"}
          </Button>
          {canEdit && unsynced.length > 0 && (
            <Button variant="outline" size="sm" onClick={runSync} disabled={syncing} className="gap-1.5">
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing…" : `Sync ${unsynced.length}`}
            </Button>
          )}
          {canEdit && (
            <NewWorkTrialDialog candidates={candidates} branches={branches} onCreate={createWorkTrial} />
          )}
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 border-b border-border pb-0">
        {(["all", "Awaiting Arrival", "Awaiting Score", "Complete"] as StatusFilter[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-sm font-medium rounded-t-md border-b-2 transition-colors ${
              statusFilter === s
                ? "border-penda-teal text-penda-teal"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {s === "all" ? "All" : s}
            <span className="ml-1.5 text-xs text-muted-foreground">
              {statusCounts[s === "all" ? "all" : s] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        <Input
          placeholder="Search candidate…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 w-44 text-sm"
        />

        <Select value={bookedFilter} onValueChange={(v) => setBookedFilter(v as BookedFilter)}>
          <SelectTrigger className="h-8 w-40 text-sm">
            <SelectValue placeholder="Booking status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All bookings</SelectItem>
            <SelectItem value="booked">Booked</SelectItem>
            <SelectItem value="not-booked">Not booked</SelectItem>
          </SelectContent>
        </Select>

        <Select value={branchFilter} onValueChange={setBranchFilter}>
          <SelectTrigger className="h-8 w-44 text-sm">
            <SelectValue placeholder="Branch" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All branches</SelectItem>
            {branches.map((b) => (
              <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-1 rounded-md border border-border p-0.5">
          <button
            onClick={() => setView("kanban")}
            title="Kanban"
            className={`p-1.5 rounded transition-colors ${view === "kanban" ? "bg-penda-teal text-white" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Columns3 className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setView("list")}
            title="List"
            className={`p-1.5 rounded transition-colors ${view === "list" ? "bg-penda-teal text-white" : "text-muted-foreground hover:text-foreground"}`}
          >
            <LayoutList className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {linkError && (
        <p className="text-sm text-destructive">{linkError}</p>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No work trials match these filters.</p>
      ) : view === "kanban" ? (
        /* ── Kanban view ──────────────────────────────────────────────────── */
        statusFilter === "all" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
            {kanbanColumns.map((col) => {
              const colTrials = filtered.filter((t) => getDisplayStatus(t) === col.status);
              return (
                <div key={col.status} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{col.label}</span>
                    <Badge variant="outline" className="text-xs">{colTrials.length}</Badge>
                  </div>
                  {colTrials.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-1">None</p>
                  ) : (
                    colTrials.map((trial) => (
                      <WorkTrialCard
                        key={trial.id}
                        trial={trial}
                        onSubmitScores={submitWorkTrialScores}
                        onUpdate={updateWorkTrial}
                        onDelete={deleteWorkTrial}
                      />
                    ))
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((trial) => (
              <WorkTrialCard
                key={trial.id}
                trial={trial}
                onSubmitScores={submitWorkTrialScores}
                onUpdate={updateWorkTrial}
                onDelete={deleteWorkTrial}
              />
            ))}
          </div>
        )
      ) : (
        /* ── List view ────────────────────────────────────────────────────── */
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Candidate</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden md:table-cell">Branch / Date</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground hidden lg:table-cell">Supervisor</th>
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((trial) => {
                const candidate = getCandidateForTrial(trial, candidates);
                const branch = getBranchForTrial(trial, branches);
                const role = openRoles.find((r) => r.id === (trial.roleId ?? candidate?.roleId));
                const status = getDisplayStatus(trial);
                const pendingApproval = trial.formSubmittedAt && trial.submittedByRole === "Incharge" && !trial.bmApprovedAt;

                return (
                  <tr key={trial.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium">{candidate?.name ?? <span className="text-destructive/70">Unlinked</span>}</p>
                      {role && <p className="text-xs text-muted-foreground">{role.title} · {role.department}</p>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {branch ? (
                        <>
                          <p className="font-medium">{branch.name}</p>
                          <p className="text-xs text-muted-foreground">{trial.date || "No date"}</p>
                        </>
                      ) : (
                        <span className="text-muted-foreground text-xs italic">Not booked</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
                      {trial.supervisor || <span className="italic">Not set</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <Badge className={STATUS_BADGE[status]}>{status}</Badge>
                        {pendingApproval && (
                          <p className="text-xs text-amber-600 dark:text-amber-400">Pending BM approval</p>
                        )}
                        {status === "Complete" && trial.total !== null && (
                          <p className="text-xs text-muted-foreground">
                            {trial.total} — <span className={trial.passFail === "Pass" ? "text-penda-teal font-medium" : "text-destructive font-medium"}>{trial.passFail}</span>
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {status !== "Complete" && !pendingApproval && canEdit && candidate && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => setScoreDialogTrialId(trial.id)}
                          >
                            Submit Scores
                          </Button>
                        )}
                        {candidate && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            title="Copy BM scoring link"
                            onClick={() => copyBmLink(trial)}
                          >
                            {copiedLinkId === trial.id
                              ? <Check className="h-3.5 w-3.5 text-penda-teal" />
                              : <Copy className="h-3.5 w-3.5" />}
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ScoreEntryDialog
        open={scoreDialogTrialId !== null}
        onOpenChange={(open) => { if (!open) setScoreDialogTrialId(null); }}
        onSubmit={(scores) => { if (scoreDialogTrialId) submitWorkTrialScores(scoreDialogTrialId, scores); }}
      />
    </div>
  );
}
