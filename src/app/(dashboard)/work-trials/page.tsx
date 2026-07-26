"use client";

import * as React from "react";
import { WorkTrial } from "@/types";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";
import { WorkTrialCard } from "@/components/work-trials/work-trial-card";
import { NewWorkTrialDialog } from "@/components/work-trials/new-work-trial-dialog";
import { Button } from "@/components/ui/button";
import { Check, Copy, RefreshCw } from "lucide-react";

export default function WorkTrialsPage() {
  const {
    workTrials, candidates, branches, openRoles,
    createWorkTrial, updateWorkTrial, deleteWorkTrial, submitWorkTrialScores, canEdit,
  } = useRecruitmentData();

  const [syncing, setSyncing] = React.useState(false);
  const [linkCopied, setLinkCopied] = React.useState(false);

  function copySchedulingLink() {
    const url = `${window.location.origin}/work-trial-request`;
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }

  // Candidates at Work Trial stage with no matching WorkTrial record.
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

  // Auto-sync on mount once data is ready.
  const syncedRef = React.useRef(false);
  React.useEffect(() => {
    if (syncedRef.current || unsynced.length === 0 || !canEdit) return;
    syncedRef.current = true;
    runSync();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unsynced, canEdit]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Work Trials</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={copySchedulingLink}
            className="gap-1.5"
            title="Copy the universal candidate scheduling link"
          >
            {linkCopied ? <Check className="h-3.5 w-3.5 text-penda-teal" /> : <Copy className="h-3.5 w-3.5" />}
            {linkCopied ? "Copied!" : "Candidate scheduling link"}
          </Button>
          {canEdit && unsynced.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={runSync}
              disabled={syncing}
              className="gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing…" : `Sync ${unsynced.length} candidate${unsynced.length !== 1 ? "s" : ""}`}
            </Button>
          )}
          {canEdit && (
            <NewWorkTrialDialog
              candidates={candidates}
              branches={branches}
              onCreate={createWorkTrial}
            />
          )}
        </div>
      </div>

      {workTrials.length === 0 ? (
        <p className="text-sm text-muted-foreground">No work trials yet.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {workTrials.map((trial) => (
            <WorkTrialCard
              key={trial.id}
              trial={trial}
              onSubmitScores={submitWorkTrialScores}
              onUpdate={updateWorkTrial}
              onDelete={deleteWorkTrial}
            />
          ))}
        </div>
      )}
    </div>
  );
}
