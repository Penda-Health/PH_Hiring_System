"use client";

import * as React from "react";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";
import { ReferenceCheck } from "@/types";
import { ReferenceCheckCard } from "@/components/reference-checks/reference-check-card";
import { NewReferenceCheckDialog } from "@/components/reference-checks/new-reference-check-dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MONTH_RANGE_OPTIONS, MonthRangeOption } from "@/lib/pipeline-helpers";
import { isWithinMonthRange } from "@/lib/date-utils";
import { getCandidateForRefCheck } from "@/lib/reference-check-helpers";
import { StatTile, StatTileRow } from "@/components/ui/stat-tile";
import { ShieldAlert, Mail, UserCheck, Send, ListChecks, Scale } from "lucide-react";

type StatusFilter = "all" | ReferenceCheck["status"];
type OutcomeFilter = "all" | ReferenceCheck["outcome"];

const STATUS_TABS: StatusFilter[] = ["all", "Awaiting Responses", "1 Referee In", "Ready for Offer"];

export default function ReferenceChecksPage() {
  const { referenceChecks, candidates, createReferenceCheck, updateReferenceCheckOutcome, canEdit, extendedLoading } =
    useRecruitmentData();

  // Reference checks accumulate indefinitely, so default this list to a
  // recent rolling window rather than every check ever run — same
  // MonthRangeOption pattern the Roles page uses for closed/filled roles.
  // Widen or pick "All time" to look further back.
  const [monthRange, setMonthRange] = React.useState<MonthRangeOption>("1");
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("all");
  const [outcomeFilter, setOutcomeFilter] = React.useState<OutcomeFilter>("all");
  const [search, setSearch] = React.useState("");

  // Date-range scoping happens first, separately from the status/outcome/
  // search filters below, so the stats row and the "Awaiting verification"
  // queue reflect the selected window on their own terms. An unreviewed
  // candidate submission always passes through regardless of age — same
  // rule Open/On Hold roles get in isRoleInMonthRange — since a TA still
  // needs to act on it no matter how old it is.
  const dateFiltered = React.useMemo(
    () =>
      referenceChecks.filter(
        (c) => c.status === "Awaiting Verification" || isWithinMonthRange(c.createdAt, monthRange)
      ),
    [referenceChecks, monthRange]
  );

  // Candidate-submitted referee details sit here until a TA reviews and
  // sends them — surface that queue first and separately so it can't get
  // lost among records that are already in progress. Not subject to the
  // status/outcome/search filters below: it's always the full queue.
  const awaitingVerification = dateFiltered.filter((c) => c.status === "Awaiting Verification");

  const rest = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    return dateFiltered.filter((c) => {
      if (c.status === "Awaiting Verification") return false;
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (outcomeFilter !== "all" && c.outcome !== outcomeFilter) return false;
      if (q && !getCandidateForRefCheck(c, candidates)?.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [dateFiltered, candidates, statusFilter, outcomeFilter, search]);

  const statusCounts = React.useMemo(() => {
    const counts: Record<string, number> = {
      all: dateFiltered.length - awaitingVerification.length,
      "Awaiting Responses": 0,
      "1 Referee In": 0,
      "Ready for Offer": 0,
    };
    for (const c of dateFiltered) {
      if (c.status === "Awaiting Verification") continue;
      counts[c.status] = (counts[c.status] ?? 0) + 1;
    }
    return counts;
  }, [dateFiltered, awaitingVerification.length]);

  // Stats scope to the date range only (dateFiltered) — never to the
  // status/outcome/search filters above — so the KPI numbers describe the
  // whole selected window, not whatever narrower slice is on screen.
  const stats = React.useMemo(() => {
    const positive = dateFiltered.filter((c) => c.outcome === "Positive").length;
    const negative = dateFiltered.filter((c) => c.outcome === "Negative").length;
    const mixed = dateFiltered.filter((c) => c.outcome === "Mixed").length;
    return {
      total: dateFiltered.length,
      awaitingResponses: statusCounts["Awaiting Responses"] ?? 0,
      oneRefereeIn: statusCounts["1 Referee In"] ?? 0,
      readyForOffer: statusCounts["Ready for Offer"] ?? 0,
      positive,
      negative,
      mixed,
      decided: positive + negative + mixed,
    };
  }, [dateFiltered, statusCounts]);

  return (
    <div className="space-y-4">
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

      {/* Stats — scoped to the date range selected above, not the narrower status/outcome/search filters below */}
      <StatTileRow className="lg:grid-cols-6">
        <StatTile label="Total in range" value={stats.total} icon={ListChecks} tone="neutral" />
        <StatTile label="Awaiting verification" value={awaitingVerification.length} icon={ShieldAlert} tone="critical" />
        <StatTile label="Awaiting responses" value={stats.awaitingResponses} icon={Mail} tone="warning" />
        <StatTile label="1 referee in" value={stats.oneRefereeIn} icon={UserCheck} tone="accent" />
        <StatTile label="Ready for offer" value={stats.readyForOffer} icon={Send} tone="success" />
        <StatTile
          label="Outcomes"
          value={stats.decided}
          sublabel={stats.decided > 0 ? `${stats.positive} positive · ${stats.negative} negative · ${stats.mixed} mixed` : "None decided yet"}
          icon={Scale}
          tone={stats.negative > 0 ? "critical" : stats.mixed > 0 ? "warning" : stats.decided > 0 ? "success" : "neutral"}
        />
      </StatTileRow>

      {/* Status tabs */}
      <div className="flex gap-1 border-b border-border pb-0">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 text-sm font-medium rounded-t-md border-b-2 transition-colors ${
              statusFilter === s
                ? "border-penda-blue text-penda-blue"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {s === "all" ? "All" : s}
            <span className="ml-1.5 text-xs text-muted-foreground">{statusCounts[s] ?? 0}</span>
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
        <Select value={outcomeFilter} onValueChange={(v) => setOutcomeFilter(v as OutcomeFilter)}>
          <SelectTrigger className="h-8 w-36 text-sm">
            <SelectValue placeholder="Outcome" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All outcomes</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Positive">Positive</SelectItem>
            <SelectItem value="Negative">Negative</SelectItem>
            <SelectItem value="Mixed">Mixed</SelectItem>
          </SelectContent>
        </Select>
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
                {monthRange === "all" && statusFilter === "all" && outcomeFilter === "all" && !search
                  ? "No other reference checks yet."
                  : "No reference checks match these filters — try widening the date range or clearing a filter."}
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
