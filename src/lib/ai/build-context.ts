import { Branch, Candidate, Interview, Offer, OpenRole, ReferenceCheck, WorkTrial } from "@/types";
import { getKpis, getSegmentSplit, getStageCounts } from "@/lib/dashboard-metrics";

export type AiContext = ReturnType<typeof buildAiContext>;

// Full-access mode: all operational data including candidate names and stages
// flows to the AI provider. PII such as phone numbers and emails is excluded
// as Penny doesn't need them to answer recruitment status questions.
export function buildAiContext(data: {
  openRoles: OpenRole[];
  candidates: Candidate[];
  offers: Offer[];
  branches?: Branch[];
  interviews?: Interview[];
  workTrials?: WorkTrial[];
  referenceChecks?: ReferenceCheck[];
  // Contributor/Branch Manager don't see real salary figures. This mirrors
  // the server-side mask already applied to /api/offers (route-handlers.ts
  // maskFields) — this is a second, independent layer so a masked value
  // never reaches the LLM even if some future path fetches offers unmasked.
  canSeeSalary?: boolean;
}) {
  const {
    openRoles,
    candidates,
    offers,
    branches = [],
    interviews = [],
    workTrials = [],
    referenceChecks = [],
    canSeeSalary = true,
  } = data;

  // ── Aggregate KPIs ─────────────────────────────────────────────────────────
  const kpis = getKpis(openRoles, candidates, offers);
  const segmentSplit = getSegmentSplit(openRoles, candidates);
  const stageCounts = getStageCounts(candidates);

  // ── Open role roster ───────────────────────────────────────────────────────
  const branchMap = new Map(branches.map((b) => [b.id, b.name]));

  const roster = openRoles.map((r) => ({
    id: r.id,
    title: r.title,
    segment: r.segment,
    department: r.department,
    location: r.location,
    status: r.status,
    priority: r.priority,
    recruiter: r.recruiter,
    hcApproved: r.hcApproved,
    hcFilled: r.hcFilled,
    hcGap: Math.max(r.hcApproved - r.hcFilled, 0),
    ...(r.notes ? { notes: r.notes } : {}),
    ...(r.internalFill ? { internalFill: true, ...(r.internalFillName ? { internalFillName: r.internalFillName } : {}) } : {}),
    ...(() => {
      const active = candidates.filter(
        (c) => c.roleId === r.id && !["Hired", "Rejected", "Withdrawn", "Backup Pool"].includes(c.stage)
      );
      if (active.length === 0) return { candidatesInPipeline: 0 };
      const pipelineByStage: Record<string, number> = {};
      for (const c of active) pipelineByStage[c.stage] = (pipelineByStage[c.stage] ?? 0) + 1;
      return { candidatesInPipeline: active.length, pipelineByStage };
    })(),
  }));

  // ── Department breakdown (pre-aggregated) ──────────────────────────────────
  const departmentBreakdown = (() => {
    const map = new Map<string, { segment: string; department: string; openRoleCount: number; hcGap: number; candidatesInPipeline: number }>();
    for (const r of openRoles) {
      if (r.status !== "Open") continue;
      const key = `${r.segment}::${r.department}`;
      const e = map.get(key) ?? { segment: r.segment, department: r.department, openRoleCount: 0, hcGap: 0, candidatesInPipeline: 0 };
      e.openRoleCount += 1;
      e.hcGap += Math.max(r.hcApproved - r.hcFilled, 0);
      e.candidatesInPipeline += candidates.filter(
        (c) => c.roleId === r.id && !["Hired", "Rejected", "Withdrawn", "Backup Pool"].includes(c.stage)
      ).length;
      map.set(key, e);
    }
    return Array.from(map.values()).sort((a, b) => b.hcGap - a.hcGap);
  })();

  // ── Branch breakdown — uses location text as fallback when branchId absent ─
  const branchBreakdown = (() => {
    const map = new Map<string, { branchName: string; openRoleCount: number; hcGap: number }>();
    for (const r of openRoles) {
      if (r.status !== "Open") continue;
      const name = (r.branchId ? branchMap.get(r.branchId) : null) ?? r.location;
      if (!name) continue;
      const e = map.get(name) ?? { branchName: name, openRoleCount: 0, hcGap: 0 };
      e.openRoleCount += 1;
      e.hcGap += Math.max(r.hcApproved - r.hcFilled, 0);
      map.set(name, e);
    }
    return Array.from(map.values()).sort((a, b) => b.hcGap - a.hcGap);
  })();

  // ── Full candidate profiles (names + stages) ───────────────────────────────
  const roleById = new Map(openRoles.map((r) => [r.id, r]));
  const candidateProfiles = candidates.map((c) => {
    const role = roleById.get(c.roleId ?? "");
    const entered = new Date(c.stageEnteredAt).getTime();
    const daysInStage = isNaN(entered) ? null : Math.floor((Date.now() - entered) / 86400000);
    return {
      name: c.name || "(no name)",
      stage: c.stage,
      roleTitle: role?.title ?? "Unknown Role",
      roleLocation: role?.location ?? "",
      segment: role?.segment ?? "",
      source: c.source,
      gender: c.gender,
      employmentType: c.employmentType,
      daysInStage,
    };
  });

  // ── Interview details ──────────────────────────────────────────────────────
  const candidateMap = new Map(candidates.map((c) => [c.id, c]));
  const now = new Date();
  const weekFromNow = new Date(now.getTime() + 7 * 86400000);

  const interviewDetails = interviews.map((i) => {
    const candidate = candidateMap.get(i.candidateId);
    const role = roleById.get(i.roleId);
    return {
      candidateName: candidate?.name || "(no name)",
      roleTitle: role?.title ?? "Unknown Role",
      roleLocation: role?.location ?? "",
      date: i.date,
      stage: i.stage,
      attendance: i.attendance,
      outcome: i.outcome,
    };
  });

  const interviewSummary = {
    totalScheduled: interviews.length,
    upcoming7Days: interviews.filter((i) => { const d = new Date(i.date); return d >= now && d <= weekFromNow; }).length,
    noShowCount: interviews.filter((i) => i.attendance === "No-show").length,
    attendedCount: interviews.filter((i) => i.attendance === "Attended").length,
    pendingCount: interviews.filter((i) => i.attendance === "Pending").length,
  };

  // ── Work trial details ─────────────────────────────────────────────────────
  const workTrialDetails = workTrials.map((t) => {
    const candidate = candidateMap.get(t.candidateId);
    const branch = branchMap.get(t.branchId) ?? t.branchId;
    return {
      candidateName: candidate?.name || "(no name)",
      branch,
      date: t.date,
      supervisor: t.supervisor,
      status: t.arrivalMarked === null ? "Awaiting Arrival" : t.total === null ? "Awaiting Score" : "Complete",
      total: t.total,
      passFail: t.passFail,
    };
  });

  const workTrialSummary = {
    total: workTrials.length,
    awaitingArrival: workTrials.filter((t) => t.arrivalMarked === null).length,
    awaitingScore: workTrials.filter((t) => t.arrivalMarked !== null && t.total === null).length,
    passed: workTrials.filter((t) => t.passFail === "Pass").length,
    failed: workTrials.filter((t) => t.passFail === "Fail").length,
  };

  // ── Reference check details ────────────────────────────────────────────────
  // aiInsights, when present, is the same persisted analysis shown on the
  // dashboard card and embedded in the PDF report (see
  // generateReferenceCheckInsights in lib/ai/reference-check-summary.ts) —
  // reusing it here rather than re-summarizing referee answers is what makes
  // Penny's read of a reference check consistent with what a TA sees.
  //
  // The full object (summary paragraph + strengths/concerns/follow-up arrays)
  // is the single heaviest thing in this context — with a long enough
  // reference-check history it alone can push the request over free-tier
  // provider token limits (see route.ts's onError). Recent checks, the ones
  // actually relevant to "should we extend an offer" questions, keep the full
  // text; older ones are reduced to the verdict + scores.
  const REFCHECK_FULL_DETAIL_DAYS = 90;
  const refCheckRecentCutoff = Date.now() - REFCHECK_FULL_DETAIL_DAYS * 86400000;

  const refCheckDetails = referenceChecks.map((rc) => {
    const candidate = candidateMap.get(rc.candidateId);
    const createdAt = new Date(rc.createdAt).getTime();
    const isRecent = isNaN(createdAt) || createdAt >= refCheckRecentCutoff;
    const insights = rc.aiInsights;
    return {
      candidateName: candidate?.name || "(no name)",
      status: rc.status,
      outcome: rc.outcome,
      refereesResponded: rc.referees.map((r) => r.responded),
      aiInsights: insights
        ? isRecent
          ? {
              overallStatus: insights.overallStatus,
              summary: insights.summary,
              recommendationScore: insights.recommendationScore,
              overallScore: insights.overallScore,
              confidenceScore: insights.confidenceScore,
              keyStrengths: insights.keyStrengths,
              areasOfConcern: insights.areasOfConcern,
              consistencyNotes: insights.consistencyNotes,
              suggestedFollowUps: insights.suggestedFollowUps,
            }
          : {
              overallStatus: insights.overallStatus,
              recommendationScore: insights.recommendationScore,
              overallScore: insights.overallScore,
            }
        : null,
    };
  });

  // ── Offer details ──────────────────────────────────────────────────────────
  const offerDetails = offers.map((o) => {
    const candidate = candidateMap.get(o.candidateId);
    const role = candidates.find((c) => c.id === o.candidateId) ? roleById.get(candidates.find((c) => c.id === o.candidateId)?.roleId ?? "") : undefined;
    return {
      candidateName: candidate?.name || "(no name)",
      roleTitle: role?.title ?? "Unknown Role",
      offeredSalary: canSeeSalary ? o.offeredSalary : null,
      outcome: o.outcome,
      deadline: o.deadline,
      joined: o.joined,
    };
  });

  const offerSummary = {
    total: offers.length,
    pending: offers.filter((o) => o.outcome === "Pending").length,
    negotiating: offers.filter((o) => o.outcome === "Negotiating").length,
    accepted: offers.filter((o) => o.outcome === "Accepted").length,
    declined: offers.filter((o) => o.outcome === "Declined").length,
    withdrawn: offers.filter((o) => o.outcome === "Withdrawn").length,
  };

  return {
    kpis,
    segmentSplit,
    stageCounts,
    departmentBreakdown,
    branchBreakdown,
    roster,
    candidateProfiles,
    interviewDetails,
    interviewSummary,
    workTrialDetails,
    workTrialSummary,
    refCheckDetails,
    offerDetails,
    offerSummary,
  };
}

export function buildSystemPrompt(context: AiContext, canEdit: boolean) {
  return [
    "You are Penny, an AI recruitment assistant inside Penda Health's hiring dashboard.",
    "You have full access to the current state of all open roles, candidates (including names and stages), interviews, work trials, reference checks, and offers. Use this data to answer questions precisely — no guessing or hallucinating records that aren't in the context.",
    "Context structure: `roster` = all open roles with location, recruiter, HC gaps, and candidate counts. `candidateProfiles` = every candidate with name, current stage, role, and days in stage. `interviewDetails` = all scheduled interviews with candidate names, dates, stages, and attendance. `workTrialDetails` = all work trials with outcomes. `refCheckDetails` = reference check statuses; when a check's referees have responded and AI insights have been generated, each entry also carries an `aiInsights` object — treat this as the analyzed read on that reference check, not just raw status, and lean on it when asked things like which candidates are safe to extend an offer to or where a reference raised concerns. For a check created in the last 90 days this includes the full analysis (summary, key strengths, areas of concern, consistency notes, suggested follow-ups); older checks are trimmed to just `overallStatus` and the three scores to keep the context small, so if those text fields are absent, give the verdict/scores you have and say the full write-up isn't available for that older check rather than inventing one. `offerDetails` = all offers with outcomes and salaries. `departmentBreakdown` and `branchBreakdown` are pre-aggregated for breakdown questions.",
    "Formatting rules: write for a human reading a chat window. Use names and role titles from the data — never invent details not present. NEVER show internal `id` field values starting with \"rec\" in visible text. For breakdown/grouping questions prefer the pre-aggregated arrays. For candidate-specific questions, scan `candidateProfiles`. Keep answers concise — bullet lists or short paragraphs.",
    "If asked to change a role's status, call the setRoleStatus tool with the role's `id` and `title` from the roster. Always confirm with the user first.",
    canEdit
      ? "The current user has edit permission."
      : "The current user is VIEW-ONLY. If they ask to change anything, explain they don't have permission.",
    "Context:",
    JSON.stringify(context),
  ].join("\n\n");
}
