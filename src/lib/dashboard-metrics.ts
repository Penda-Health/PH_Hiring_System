import { Candidate, CandidateStage, Interview, Locum, NewEmployee, Offer, OpenRole, Reliever, Segment, WorkTrial } from "@/types";
import { getCoverageRate } from "@/lib/pools-helpers";
import { DashboardPeriod, PERIOD_LABELS } from "@/lib/dashboard-filters";

const HARD_TO_FILL_TITLES = ["Pharm Tech", "COHO", "Dentist"];

function isActiveStage(stage: CandidateStage) {
  return !["Hired", "Rejected", "Withdrawn"].includes(stage);
}

function isCurrentMonth(dateStr: string) {
  const d = new Date(`${dateStr}T00:00:00`);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function daysBetween(startStr: string | null | undefined, endStr: string | null | undefined): number | null {
  if (!startStr || !endStr) return null;
  const start = new Date(startStr);
  const end = new Date(endStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
  return diff >= 0 ? diff : null;
}

export type MetricRow = {
  num: number;
  metric: string;   // stable lookup key (icon, color, etc.)
  label?: string;   // display override — e.g. "Hired (Last 30 Days)" vs "Hired MTD"
  category: string;
  formula: string;
  target: string;
  updates: string;
  value: string;
};

export function getAllMetrics(data: {
  candidates: Candidate[];
  openRoles: OpenRole[];
  offers: Offer[];
  workTrials: WorkTrial[];
  interviews: Interview[];
  relievers: Reliever[];
  locums: Locum[];
  newEmployees: NewEmployee[];
}, period: DashboardPeriod = "all"): MetricRow[] {
  const { candidates, openRoles, offers, workTrials, interviews, relievers, locums, newEmployees } = data;
  const coverageRate = getCoverageRate(relievers, locums);
  const roleById = new Map(openRoles.map((r) => [r.id, r]));
  const candidateById = new Map(candidates.map((c) => [c.id, c]));

  const openRolesList = openRoles.filter((r) => r.status === "Open");
  const hcRemaining = openRolesList.reduce((sum, r) => sum + Math.max(r.hcApproved - r.hcFilled, 0), 0);
  const activeCandidates = candidates.filter((c) => isActiveStage(c.stage));
  const offersOut = candidates.filter((c) => c.stage === "Offer");
  // When period = "all", scope hired to current calendar month (MTD).
  // For any other period, the candidates list is already pre-filtered by the
  // dashboard period filter, so just count all hired in that set.
  const hiredMtd = period === "all"
    ? candidates.filter((c) => c.stage === "Hired" && isCurrentMonth(c.stageEnteredAt))
    : candidates.filter((c) => c.stage === "Hired");

  // Time to hire: datePosted → dateClosed on all Filled roles that have both dates.
  // Skip any role missing either data point rather than produce NaN.
  const ipsTimes: number[] = [];
  const soTimes: number[] = [];
  for (const r of openRoles) {
    if (r.status !== "Filled") continue;
    const days = daysBetween(r.datePosted, r.dateClosed);
    if (days === null) continue;
    if (r.segment === "IPS") ipsTimes.push(days);
    else if (r.segment === "SO") soTimes.push(days);
  }
  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
  const avgIps = avg(ipsTimes);
  const avgSo = avg(soTimes);
  const timeToHireValue =
    avgIps === null && avgSo === null
      ? "—"
      : [
          avgIps !== null ? `IPS ${avgIps.toFixed(0)}d (${ipsTimes.length})` : null,
          avgSo !== null ? `SO ${avgSo.toFixed(0)}d (${soTimes.length})` : null,
        ]
          .filter(Boolean)
          .join(" · ");

  const noShows = interviews.filter((i) => i.attendance === "No-show").length;
  const noShowRate = interviews.length ? (noShows / interviews.length) * 100 : 0;

  // Hired = accepted offer; Withdrawn = declined/pulled out. Both are terminal pipeline stages.
  const hiredCandidates = candidates.filter((c) => c.stage === "Hired");
  const withdrawnCandidates = candidates.filter((c) => c.stage === "Withdrawn");
  const totalResolvedOffers = hiredCandidates.length + withdrawnCandidates.length;
  const offerAcceptanceRate = totalResolvedOffers > 0
    ? (hiredCandidates.length / totalResolvedOffers) * 100
    : 0;
  // Keep offer-table path for post-offer drop rate (needs joined status)
  const acceptedOffers = offers.filter((o) => o.outcome === "Accepted");

  const postOfferDrops = acceptedOffers.filter((o) => o.joined === "Did Not Join").length;
  const postOfferDropRate = acceptedOffers.length ? (postOfferDrops / acceptedOffers.length) * 100 : 0;

  const ipsWorkTrials = workTrials.filter((wt) => {
    const candidate = candidateById.get(wt.candidateId);
    const segment = candidate ? roleById.get(candidate.roleId)?.segment : undefined;
    return segment === "IPS";
  });
  const ipsPasses = ipsWorkTrials.filter((wt) => wt.passFail === "Pass").length;
  const workTrialPassRate = ipsWorkTrials.length ? (ipsPasses / ipsWorkTrials.length) * 100 : 0;

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const eligibleForConfirmation = newEmployees.filter((e) => new Date(`${e.startDate}T00:00:00`) <= sixMonthsAgo);
  const confirmed6mo = eligibleForConfirmation.filter((e) => e.confirmation6mo === "Confirmed").length;
  const confirmRate6mo = eligibleForConfirmation.length ? (confirmed6mo / eligibleForConfirmation.length) * 100 : null;

  const hardToFillOpen = openRolesList.filter((r) => HARD_TO_FILL_TITLES.includes(r.title)).length;

  const activeRecruiters = new Set(openRolesList.map((r) => r.recruiter)).size;
  const recruiterRoleRatio = activeRecruiters ? openRolesList.length / activeRecruiters : 0;

  const referralHires = hiredMtd.filter((c) => c.source === "Referral").length;
  const referralHireRate = hiredMtd.length ? (referralHires / hiredMtd.length) * 100 : 0;

  const rolesWithActiveCandidate = openRolesList.filter((r) =>
    activeCandidates.some((c) => c.roleId === r.id)
  ).length;
  const pipelineCoverageRate = openRolesList.length
    ? (rolesWithActiveCandidate / openRolesList.length) * 100
    : 0;

  return [
    {
      num: 1,
      metric: "Open Roles",
      category: "Operations",
      formula: "COUNT(roles WHERE status = open)",
      target: "Contextual — no absolute target",
      updates: "Real-time",
      value: String(openRolesList.length),
    },
    {
      num: 2,
      metric: "HC Remaining",
      category: "Operations",
      formula: "SUM(hc_approved - hc_filled) WHERE status = open",
      target: "Trend down toward 0",
      updates: "Real-time",
      value: String(hcRemaining),
    },
    {
      num: 3,
      metric: "Active Candidates",
      category: "Operations",
      formula: "COUNT(candidates WHERE stage NOT IN hired, rejected, withdrawn)",
      target: "Contextual",
      updates: "Real-time",
      value: String(activeCandidates.length),
    },
    {
      num: 4,
      metric: "Offers Out",
      category: "Operations",
      formula: "COUNT(offers WHERE outcome = pending OR negotiating)",
      target: "Low number = good velocity",
      updates: "Real-time",
      value: String(offersOut.length),
    },
    {
      num: 5,
      metric: "Hired MTD",
      label: period === "all" || period === "mtd" ? undefined : `Hired (${PERIOD_LABELS[period]})`,
      category: "Operations",
      formula: "COUNT(candidates WHERE stage = hired AND joined_date in current month)",
      target: "vs monthly hiring plan",
      updates: "Real-time",
      value: String(hiredMtd.length),
    },
    {
      num: 6,
      metric: "Avg Time to Hire",
      category: "Speed",
      formula: "AVG(joined_date - req_approved_date) for roles closed this month",
      target: "IPS <35d · Specialist <65d",
      updates: "Daily",
      value: timeToHireValue,
    },
    {
      num: 7,
      metric: "No-Show Rate",
      category: "Experience",
      formula: "COUNT(attended = no_show) / COUNT(all scheduled interviews) × 100",
      target: "<10%",
      updates: "Daily",
      value: `${noShowRate.toFixed(1)}%`,
    },
    {
      num: 8,
      metric: "Offer Acceptance Rate",
      category: "Conversion",
      formula: "COUNT(outcome = accepted) / COUNT(all offers) × 100",
      target: "≥80%",
      updates: "Real-time",
      value: `${offerAcceptanceRate.toFixed(1)}%`,
    },
    {
      num: 9,
      metric: "Post-Offer Drop Rate",
      category: "Conversion",
      formula: "COUNT(joined = did_not_join) / COUNT(outcome = accepted) × 100",
      target: "<10%",
      updates: "Real-time",
      value: `${postOfferDropRate.toFixed(1)}%`,
    },
    {
      num: 10,
      metric: "Work Trial Pass Rate",
      category: "Quality",
      formula: "COUNT(pass_fail = pass) / COUNT(all work trials) × 100 (IPS only)",
      target: "≥70% (contextual)",
      updates: "Real-time",
      value: `${workTrialPassRate.toFixed(1)}%`,
    },
    {
      num: 11,
      metric: "6-Month Confirm Rate",
      category: "Quality",
      formula: "COUNT(confirmation_6mo = confirmed) / COUNT(all hired, 6mo+ ago) × 100",
      target: "≥85%",
      updates: "Weekly",
      value: confirmRate6mo === null ? "—" : `${confirmRate6mo.toFixed(1)}%`,
    },
    {
      num: 12,
      metric: "Hard-to-Fill Watch",
      category: "Risk",
      formula: "COUNT(roles WHERE title IN [PharmTech, COHO, Dentist] AND status = open)",
      target: "Target 0 open",
      updates: "Real-time",
      value: String(hardToFillOpen),
    },
    {
      num: 13,
      metric: "Recruiter Role Ratio",
      category: "Team",
      formula: "COUNT(open roles) / COUNT(active recruiters)",
      target: "≤15 roles per recruiter",
      updates: "Real-time",
      value: activeRecruiters ? recruiterRoleRatio.toFixed(1) : "—",
    },
    {
      num: 14,
      metric: "Referral Hire Rate",
      category: "Source",
      formula: "COUNT(hires WHERE source = referral) / COUNT(all hires MTD) × 100",
      target: "≥30%",
      updates: "MTD rolling",
      value: `${referralHireRate.toFixed(1)}%`,
    },
    {
      num: 15,
      metric: "Pipeline Coverage Rate",
      category: "Risk",
      formula: "COUNT(open roles WITH ≥1 active candidate) / COUNT(all open roles) × 100",
      target: "≥80%",
      updates: "Real-time",
      value: `${pipelineCoverageRate.toFixed(1)}%`,
    },
    {
      num: 16,
      metric: "Locum & Reliever Coverage",
      category: "Risk",
      formula: "COUNT(coverage zones WITH ≥1 active reliever OR locum) / COUNT(all zones) × 100",
      target: "≥80%",
      updates: "Real-time",
      value: `${coverageRate.toFixed(1)}%`,
    },
  ];
}

export const PIPELINE_STAGES: CandidateStage[] = [
  "First Interview",
  "Second Interview",
  "Panel Interview",
  "Work Trial",
  "Reference Check",
  "Offer",
  "Hired",
];

export function getStageCounts(candidates: Candidate[]) {
  return PIPELINE_STAGES.map((stage) => ({
    stage,
    count: candidates.filter((c) => c.stage === stage).length,
  }));
}

export function getSegmentSplit(openRoles: OpenRole[], candidates: Candidate[]) {
  const segments: Segment[] = ["IPS", "SO"];
  return segments.map((segment) => {
    const openInSegment = openRoles.filter((r) => r.segment === segment && r.status === "Open");
    const roleIds = new Set(openRoles.filter((r) => r.segment === segment).map((r) => r.id));
    return {
      segment,
      candidateCount: candidates.filter((c) => roleIds.has(c.roleId)).length,
      // HC remaining = unfilled slots only, matching the KPI tile and dept bars
      headcount: openInSegment.reduce((sum, r) => sum + Math.max((r.hcApproved ?? 0) - (r.hcFilled ?? 0), 0), 0),
      roleCount: openInSegment.length,
    };
  });
}

export function getKpis(openRoles: OpenRole[], candidates: Candidate[], offers: Offer[]) {
  const openRolesCount = openRoles.filter((r) => r.status === "Open").length;
  const totalHcGap = openRoles
    .filter((r) => r.status === "Open")
    .reduce((sum, r) => sum + Math.max(r.hcApproved - r.hcFilled, 0), 0);
  const activePipeline = candidates.filter(
    (c) => !["Hired", "Rejected", "Withdrawn", "Backup Pool"].includes(c.stage)
  ).length;
  const pendingOffers = offers.filter((o) => o.outcome === "Pending" || o.outcome === "Negotiating").length;

  return { openRolesCount, totalHcGap, activePipeline, pendingOffers };
}
