"use client";

import { useRecruitmentData } from "@/lib/data-store/recruitment-context";
import { ReferenceCheckCard } from "@/components/reference-checks/reference-check-card";
import { NewReferenceCheckDialog } from "@/components/reference-checks/new-reference-check-dialog";

export default function ReferenceChecksPage() {
  const { referenceChecks, candidates, createReferenceCheck, updateReferenceCheckOutcome, canEdit, extendedLoading } =
    useRecruitmentData();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Reference Checks</h1>
          {extendedLoading && (
            <span className="text-xs text-muted-foreground animate-pulse">Loading…</span>
          )}
        </div>
        {canEdit && (
          <NewReferenceCheckDialog candidates={candidates} onCreate={createReferenceCheck} />
        )}
      </div>
      {referenceChecks.length === 0 ? (
        // Extended data (this page's resource) loads in a second phase after
        // the app is already interactive — don't claim "none yet" until that
        // phase has actually finished, or a legitimate list flashes empty.
        <p className="text-sm text-muted-foreground">
          {extendedLoading ? "Loading reference checks…" : "No reference checks yet."}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {referenceChecks.map((check) => (
            <ReferenceCheckCard key={check.id} refCheck={check} onUpdateOutcome={updateReferenceCheckOutcome} />
          ))}
        </div>
      )}
    </div>
  );
}
