"use client";

import * as React from "react";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";
import { ReferenceCheckCard } from "@/components/reference-checks/reference-check-card";
import { NewReferenceCheckDialog } from "@/components/reference-checks/new-reference-check-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MONTH_RANGE_OPTIONS, MonthRangeOption } from "@/lib/pipeline-helpers";
import { isWithinMonthRange } from "@/lib/date-utils";

export default function ReferenceChecksPage() {
  const { referenceChecks, createReferenceCheck, updateReferenceCheckOutcome, canEdit, extendedLoading } =
    useRecruitmentData();

  // Reference checks accumulate indefinitely, so default this list to a
  // recent rolling window rather than every check ever run — same
  // MonthRangeOption pattern the Roles page uses for closed/filled roles.
  // Widen or pick "All time" to look further back.
  const [monthRange, setMonthRange] = React.useState<MonthRangeOption>("1");

  // Candidate-submitted referee details sit here until a TA reviews and
  // sends them — surface that queue first and separately so it can't get
  // lost among records that are already in progress. These always pass
  // through the date filter below: an unreviewed submission still needs
  // action no matter how old it is, the same way Open/On Hold roles always
  // pass through isRoleInMonthRange.
  const awaitingVerification = referenceChecks.filter((c) => c.status === "Awaiting Verification");
  const rest = referenceChecks.filter(
    (c) => c.status !== "Awaiting Verification" && isWithinMonthRange(c.createdAt, monthRange)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">Reference Checks</h1>
          {extendedLoading && (
            <span className="text-xs text-muted-foreground animate-pulse">Loading…</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select value={monthRange} onValueChange={(v) => setMonthRange(v as MonthRangeOption)}>
            <SelectTrigger className="h-8 w-36 text-sm">
              <SelectValue placeholder="Date range" />
            </SelectTrigger>
            <SelectContent>
              {MONTH_RANGE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {canEdit && (
            <NewReferenceCheckDialog onCreate={createReferenceCheck} />
          )}
        </div>
      </div>
      {referenceChecks.length === 0 ? (
        // Extended data (this page's resource) loads in a second phase after
        // the app is already interactive — don't claim "none yet" until that
        // phase has actually finished, or a legitimate list flashes empty.
        <p className="text-sm text-muted-foreground">
          {extendedLoading ? "Loading reference checks…" : "No reference checks yet."}
        </p>
      ) : (
        <>
          {awaitingVerification.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-amber-700">
                Awaiting verification ({awaitingVerification.length})
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {awaitingVerification.map((check) => (
                  <ReferenceCheckCard key={check.id} refCheck={check} onUpdateOutcome={updateReferenceCheckOutcome} />
                ))}
              </div>
            </div>
          )}
          <div className="space-y-3">
            {awaitingVerification.length > 0 && <h2 className="text-sm font-semibold text-muted-foreground">All others</h2>}
            {rest.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {monthRange === "all"
                  ? "No other reference checks yet."
                  : "No other reference checks in this date range — try widening it."}
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {rest.map((check) => (
                  <ReferenceCheckCard key={check.id} refCheck={check} onUpdateOutcome={updateReferenceCheckOutcome} />
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
