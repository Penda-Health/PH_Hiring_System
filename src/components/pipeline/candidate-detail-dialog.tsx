"use client";

import * as React from "react";
import { Candidate, Interview, Offer, ReferenceCheck, WorkTrial } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getRoleForCandidate, getCandidateRoleDisplay, daysInStage } from "@/lib/pipeline-helpers";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";
import { daysOfTrial, latestDayOf } from "@/lib/work-trial-days";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "good" | "bad" | "wait";

const TONE: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground border-transparent",
  good: "bg-success-bg text-success-fg border-transparent",
  bad: "bg-critical-bg text-critical-fg border-transparent",
  wait: "bg-high-bg text-high-fg border-transparent",
};

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  const date = new Date(d.length === 10 ? `${d}T00:00:00` : d);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function fmtKes(n: number | undefined): string | undefined {
  return n ? `KES ${n.toLocaleString("en-KE")}` : undefined;
}

const latest = <T,>(items: T[], date: (t: T) => string | null | undefined): T | undefined =>
  [...items].sort((a, b) => (date(b) ?? "").localeCompare(date(a) ?? ""))[0];

function workTrialSummary(trial: WorkTrial | undefined, all: WorkTrial[], fallback?: string) {
  if (!trial) return fallback ? { label: fallback, tone: "neutral" as Tone } : { label: "Not scheduled", tone: "neutral" as Tone };
  const last = latestDayOf(trial, all);
  if (last.needsAnotherDay) return { label: "Needs another day", tone: "wait" as Tone };
  if (last.passFail === "Pass") return { label: "Passed", tone: "good" as Tone };
  if (last.passFail === "Fail") return { label: "Failed", tone: "bad" as Tone };
  if (last.arrivalMarked === false) return { label: "Did not arrive", tone: "bad" as Tone };
  if (last.arrivalMarked) return { label: "Awaiting score", tone: "wait" as Tone };
  return { label: "Scheduled", tone: "wait" as Tone };
}

function refCheckSummary(rc: ReferenceCheck | undefined, fallback?: string) {
  if (!rc) return { label: fallback || "Not started", tone: "neutral" as Tone };
  if (rc.outcome === "Positive") return { label: "Positive", tone: "good" as Tone };
  if (rc.outcome === "Negative") return { label: "Negative", tone: "bad" as Tone };
  if (rc.outcome === "Mixed") return { label: "Mixed", tone: "wait" as Tone };
  return { label: rc.status, tone: "wait" as Tone };
}

function offerSummary(o: Offer | undefined, fallback?: string) {
  const outcome = o?.outcome ?? fallback;
  if (!outcome) return { label: "No offer yet", tone: "neutral" as Tone };
  const tone: Tone = outcome === "Accepted" ? "good" : outcome === "Declined" || outcome === "Withdrawn" ? "bad" : "wait";
  return { label: outcome, tone };
}

function interviewTone(i: Interview): Tone {
  if (i.attendance === "No-show") return "bad";
  return i.outcome === "Pass" ? "good" : i.outcome === "Fail" ? "bad" : "wait";
}

export function CandidateDetailDialog({
  candidate,
  onOpenChange,
}: {
  candidate: Candidate | null;
  onOpenChange: (open: boolean) => void;
}) {
  const { openRoles, branches, interviews, workTrials, referenceChecks, offers, newEmployees } = useRecruitmentData();
  const role = candidate ? getRoleForCandidate(candidate, openRoles) : undefined;
  const roleDisplay = candidate ? getCandidateRoleDisplay(candidate, openRoles) : undefined;

  const d = React.useMemo(() => {
    if (!candidate) return null;
    const id = candidate.id;
    const myTrials = workTrials.filter((t) => t.candidateId === id);
    // Day 1 of the most recent trial; its later days are looked up from there.
    const trial = latest(
      myTrials.filter((t) => !t.parentTrialId),
      (t) => t.date
    ) ?? latest(myTrials, (t) => t.date);
    const employee = newEmployees.find((e) => e.candidateId === id);
    return {
      interviews: interviews
        .filter((i) => i.candidateId === id)
        .sort((a, b) => (a.date || "").localeCompare(b.date || "")),
      trial,
      trialDays: trial ? daysOfTrial(trial, workTrials) : [],
      refCheck: latest(
        referenceChecks.filter((r) => r.candidateId === id),
        (r) => r.createdAt
      ),
      offer: latest(
        offers.filter((o) => o.candidateId === id),
        (o) => o.dateSent
      ),
      employee,
    };
  }, [candidate, interviews, workTrials, referenceChecks, offers, newEmployees]);

  const branchName = (branchId: string | undefined) => branches.find((b) => b.id === branchId)?.name;

  return (
    <Dialog open={!!candidate} onOpenChange={onOpenChange}>
      <DialogContent allowOutsideClose className="max-w-2xl">
        {candidate && d && (
          <>
            <DialogHeader>
              <DialogTitle>{candidate.name}</DialogTitle>
              <DialogDescription>
                {roleDisplay?.title ?? "Unknown role"} · {candidate.stage}
                {candidate.candId ? ` · ${candidate.candId}` : ""}
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-wrap gap-2">
              {roleDisplay?.segment && (
                <Badge variant={roleDisplay.segment === "IPS" ? "ips" : "so"}>{roleDisplay.segment}</Badge>
              )}
              {role && (
                <Badge variant={role.priority === "Critical" ? "critical" : role.priority === "High" ? "high" : "outline"}>
                  {role.priority}
                </Badge>
              )}
              <Badge variant="outline">{daysInStage(candidate.stageEnteredAt)} days in stage</Badge>
            </div>

            {(() => {
              const isHired = candidate.stage === "Hired";
              const mc = branchName(d.employee?.branchId) ?? branchName(role?.branchId) ?? (role?.location || undefined);
              const join = candidate.joined ?? d.offer?.joined;
              return (
                <Section title={isHired ? "Hire" : "Placement"}>
                  <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                    <Field label="MC allocated" value={mc ?? (isHired ? "Not set" : "—")} />
                    <Field label="Role" value={role ? `${role.title} (${role.roleId})` : roleDisplay?.title ?? "—"} />
                    <Field label="Department" value={role?.department || candidate.department || "—"} />
                    {isHired && <Field label="Date hired" value={fmtDate(candidate.stageEnteredAt)} />}
                    {isHired && (
                      <Field label="Expected joining" value={fmtDate(candidate.expectedJoiningDate ?? d.offer?.startDate)} />
                    )}
                    {isHired && (
                      <div>
                        <p className="text-xs text-muted-foreground">Reporting</p>
                        <StatusBadge
                          label={join === "Joined" ? `Joined ${fmtDate(candidate.joinedOn)}` : join ?? "Pending"}
                          tone={join === "Joined" ? "good" : join === "Did Not Join" ? "bad" : "wait"}
                        />
                      </div>
                    )}
                    {isHired && candidate.dropOffReason && (
                      <Field label="Why they didn't join" value={candidate.dropOffReason} className="col-span-full" />
                    )}
                    {d.employee && <Field label="Employee ID" value={d.employee.employeeId} />}
                    {d.employee?.confirmation6mo && <Field label="6-month confirmation" value={d.employee.confirmation6mo} />}
                    {role?.hiringManager && <Field label="Hiring manager" value={role.hiringManager} />}
                    {role?.recruiter && <Field label="Recruiter" value={role.recruiter} />}
                  </div>
                </Section>
              );
            })()}

            <Section title="Hiring progress">
              <div className="divide-y rounded-md border text-sm">
                <ProgressRow
                  label="Interviews"
                  status={
                    d.interviews.length
                      ? {
                          label: `${d.interviews.length} interview${d.interviews.length === 1 ? "" : "s"}`,
                          tone: interviewTone(d.interviews[d.interviews.length - 1]),
                        }
                      : { label: "None recorded", tone: "neutral" }
                  }
                >
                  {d.interviews.map((i) => (
                    <div key={i.id}>
                      {i.stage} · {fmtDate(i.date)} ·{" "}
                      {i.attendance === "No-show" ? "No-show" : i.outcome === "Pending" ? "Outcome pending" : i.outcome}
                    </div>
                  ))}
                </ProgressRow>

                <ProgressRow label="Work trial" status={workTrialSummary(d.trial, workTrials, candidate.workTrialStatus)}>
                  {d.trial && (
                    <>
                      <div>
                        {fmtDate(d.trial.date)}
                        {d.trialDays.length > 1 && ` (+${d.trialDays.length - 1} more day${d.trialDays.length > 2 ? "s" : ""})`}
                        {" · "}
                        {branchName(d.trial.branchId) ?? "—"}
                        {d.trial.supervisor ? ` · Supervisor: ${d.trial.supervisor}` : ""}
                      </div>
                      {latestDayOf(d.trial, workTrials).total != null && (
                        <div>Score: {latestDayOf(d.trial, workTrials).total}</div>
                      )}
                    </>
                  )}
                </ProgressRow>

                <ProgressRow label="Reference check" status={refCheckSummary(d.refCheck, candidate.refCheckStatus)}>
                  {d.refCheck && (
                    <div>
                      {d.refCheck.referees.filter((r) => r.responded).length} of {d.refCheck.referees.length} referees responded
                      {d.refCheck.outcome !== "Pending" ? ` · ${d.refCheck.status}` : ""} · started {fmtDate(d.refCheck.createdAt)}
                      {d.refCheck.reportPdfUrl && (
                        <>
                          {" · "}
                          <a href={d.refCheck.reportPdfUrl} target="_blank" rel="noreferrer" className="text-penda-blue hover:underline">
                            Report
                          </a>
                        </>
                      )}
                    </div>
                  )}
                </ProgressRow>

                <ProgressRow label="Offer" status={offerSummary(d.offer, candidate.offerStatus)}>
                  {d.offer && (
                    <div>
                      Sent {fmtDate(d.offer.dateSent)}
                      {fmtKes(d.offer.finalAcceptedSalary ?? d.offer.offeredSalary)
                        ? ` · ${fmtKes(d.offer.finalAcceptedSalary ?? d.offer.offeredSalary)}`
                        : ""}
                      {d.offer.startDate ? ` · Start ${fmtDate(d.offer.startDate)}` : ""}
                    </div>
                  )}
                </ProgressRow>
              </div>
            </Section>

            <Section title="Contact & application">
              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <Field label="Phone" value={candidate.phone || "—"} />
                <Field label="Email" value={candidate.email || "—"} className="col-span-2 break-all" />
                <Field label="Source" value={candidate.source || "—"} />
                <Field label="Gender" value={candidate.gender ?? "—"} />
                <Field label="Employment type" value={candidate.employmentType} />
                <Field label="Applied" value={fmtDate(candidate.createdAt)} />
              </div>
            </Section>

            {(candidate.referee1 || candidate.referee2) && (
              <Section title="Referees">
                {candidate.referee1 && (
                  <p className="text-sm">{candidate.referee1.name} — {candidate.referee1.phone}</p>
                )}
                {candidate.referee2 && (
                  <p className="text-sm">{candidate.referee2.name} — {candidate.referee2.phone}</p>
                )}
              </Section>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <Separator />
      <div className="space-y-2.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
        {children}
      </div>
    </>
  );
}

function StatusBadge({ label, tone }: { label: string; tone: Tone }) {
  return <Badge className={cn("mt-0.5", TONE[tone])}>{label}</Badge>;
}

function ProgressRow({
  label,
  status,
  children,
}: {
  label: string;
  status: { label: string; tone: Tone };
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 px-3 py-2.5">
      <div className="min-w-0">
        <p className="font-medium">{label}</p>
        {children && <div className="mt-0.5 space-y-0.5 text-xs text-muted-foreground">{children}</div>}
      </div>
      <StatusBadge label={status.label} tone={status.tone} />
    </div>
  );
}

function Field({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
