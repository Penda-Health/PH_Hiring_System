"use client";

import * as React from "react";
import { RequisitionType, RequisitionLevel, VacancyReasonType, Priority } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormShell, FormStatusCard, DraftRestoredBanner, type FormShellBrand } from "@/components/forms/form-shell";
import { RoleTitleInput } from "@/components/requisitions/role-title-input";
import { RequesterGoogleIdentity, RequesterSignInGate, type RequesterIdentity } from "@/components/requisitions/requester-google-identity";
import { ApprovalChainPreview } from "@/components/requisitions/approval-chain-preview";
import type { WorkflowPreviewStep } from "@/lib/requisitions/workflow";
import { SO_DEPARTMENTS } from "@/lib/department-options";
import { loadSoDraft, saveSoDraft, clearSoDraft } from "@/lib/forms/requisition-request-draft";

const BRAND: FormShellBrand = {
  eyebrow: "Penda Health · Support Office Requisition",
  headline: "Raise a support office role for approval.",
  lede: "Your request goes to each approver in turn and enters the hiring pipeline once the last one signs off.",
  footer: "Questions? careers@pendahealth.com",
};

const SO_TYPES: { value: RequisitionType; label: string; description: string }[] = [
  { value: "SO New Role", label: "New Role", description: "A brand-new support office role that doesn't replace anyone" },
  { value: "SO Replacement", label: "Replacement", description: "Backfilling a role someone has left" },
];

const LEVELS: RequisitionLevel[] = ["Entry", "Junior", "Mid", "Senior", "Lead", "Manager", "Senior Manager", "Head/Director"];
const REASON_TYPES: VacancyReasonType[] = ["Resignation", "Termination", "Internal Promotion", "Retirement", "Contract End", "Other"];
const URGENCIES: Priority[] = ["Critical", "High", "Medium", "Low"];

export default function PublicSoRequisitionRequestPage() {
  const [submitterName, setSubmitterName] = React.useState("");
  // Google sign-in, not a typed email — see RequesterGoogleIdentity.
  const [identity, setIdentity] = React.useState<RequesterIdentity | null>(null);
  const submitterEmail = identity?.email ?? "";
  const [approvers, setApprovers] = React.useState<WorkflowPreviewStep[] | null>(null);
  const [submitterRole, setSubmitterRole] = React.useState("");
  const [honeypot, setHoneypot] = React.useState("");

  const [type, setType] = React.useState<RequisitionType>("SO New Role");
  const [roleTitle, setRoleTitle] = React.useState("");
  const [department, setDepartment] = React.useState("");
  const [headcount, setHeadcount] = React.useState(1);
  const [level, setLevel] = React.useState<RequisitionLevel>("Mid");
  const [justification, setJustification] = React.useState("");
  const [salaryMin, setSalaryMin] = React.useState<number | "">("");
  const [salaryMax, setSalaryMax] = React.useState<number | "">("");
  const [jdUrl, setJdUrl] = React.useState("");
  const [jdAttached, setJdAttached] = React.useState(false);
  const [urgency, setUrgency] = React.useState<Priority>("Medium");
  const [expectedStartDate, setExpectedStartDate] = React.useState("");
  const [reasonType, setReasonType] = React.useState<VacancyReasonType>("Resignation");
  const [jdStillCurrent, setJdStillCurrent] = React.useState(true);
  const [context, setContext] = React.useState("");
  const [budgetEvaluationConfirmed, setBudgetEvaluationConfirmed] = React.useState(false);

  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [roleTitleSuggestions, setRoleTitleSuggestions] = React.useState<string[]>([]);
  const [draftRestored, setDraftRestored] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/public/requisition-request?segment=SO")
      .then((res) => res.json())
      .then((body) => {
        setRoleTitleSuggestions(body.roleTitles ?? []);
        setApprovers(body.approvers ?? []);
      })
      .catch(() => {});

    const draft = loadSoDraft();
    if (draft) {
      setSubmitterName(draft.submitterName);
      setSubmitterRole(draft.submitterRole);
      setType(draft.type as RequisitionType);
      setRoleTitle(draft.roleTitle);
      setDepartment(draft.department);
      setHeadcount(draft.headcount);
      setLevel(draft.level as RequisitionLevel);
      setJustification(draft.justification);
      setSalaryMin(draft.salaryMin);
      setSalaryMax(draft.salaryMax);
      setJdUrl(draft.jdUrl);
      setJdAttached(draft.jdAttached);
      setUrgency(draft.urgency as Priority);
      setExpectedStartDate(draft.expectedStartDate);
      setReasonType(draft.reasonType as VacancyReasonType);
      setJdStillCurrent(draft.jdStillCurrent);
      setContext(draft.context);
      setBudgetEvaluationConfirmed(draft.budgetEvaluationConfirmed);
      setDraftRestored(true);
    }
  }, []);

  // Debounced autosave — only once there's something worth restoring.
  React.useEffect(() => {
    if (submitted) return;
    const hasContent = submitterName.trim() || roleTitle.trim() || justification.trim() || context.trim();
    if (!hasContent) return;
    const handle = setTimeout(() => {
      saveSoDraft({
        submitterName,
        submitterEmail,
        submitterRole,
        type,
        roleTitle,
        department,
        headcount,
        level,
        justification,
        salaryMin,
        salaryMax,
        jdUrl,
        jdAttached,
        urgency,
        expectedStartDate,
        reasonType,
        jdStillCurrent,
        context,
        budgetEvaluationConfirmed,
      });
    }, 500);
    return () => clearTimeout(handle);
  }, [
    submitted,
    submitterName,
    submitterEmail,
    submitterRole,
    type,
    roleTitle,
    department,
    headcount,
    level,
    justification,
    salaryMin,
    salaryMax,
    jdUrl,
    jdAttached,
    urgency,
    expectedStartDate,
    reasonType,
    jdStillCurrent,
    context,
    budgetEvaluationConfirmed,
  ]);

  function discardDraftAndRestart() {
    clearSoDraft();
    setDraftRestored(false);
    setSubmitterName("");
    setSubmitterRole("");
    setType("SO New Role");
    setRoleTitle("");
    setDepartment("");
    setHeadcount(1);
    setLevel("Mid");
    setJustification("");
    setSalaryMin("");
    setSalaryMax("");
    setJdUrl("");
    setJdAttached(false);
    setUrgency("Medium");
    setExpectedStartDate("");
    setReasonType("Resignation");
    setJdStillCurrent(true);
    setContext("");
    setBudgetEvaluationConfirmed(false);
  }

  const isNewRole = type === "SO New Role";

  const canSubmit =
    submitterName.trim() &&
    identity &&
    submitterRole.trim() &&
    roleTitle.trim() &&
    department.trim() &&
    budgetEvaluationConfirmed &&
    (isNewRole ? justification.trim().length >= 100 : context.trim().length >= 20);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/requisition-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submitterName,
          credential: identity?.credential,
          submitterRole,
          honeypot,
          type,
          roleTitle,
          department,
          segment: "SO",
          reasonType: isNewRole ? undefined : reasonType,
          employmentType: "Full-time",
          level,
          headcount,
          justification: isNewRole ? justification : context,
          salaryRangeMin: salaryMin === "" ? undefined : salaryMin,
          salaryRangeMax: salaryMax === "" ? undefined : salaryMax,
          urgency,
          jdAttached: isNewRole ? jdAttached : jdStillCurrent,
          jdUrl: jdUrl || undefined,
          expectedStartDate: expectedStartDate || undefined,
          context: isNewRole ? undefined : context,
          budgetEvaluationConfirmed,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        if (body.error === "invalid_google_token") {
          // Google ID tokens last an hour — a long form can outlive one.
          setIdentity(null);
          throw new Error("Your Google sign-in expired. Sign in again to resubmit — your answers are kept.");
        }
        if (body.error === "not_penda_account") {
          setIdentity(null);
          throw new Error("Sign in with your Penda Google account to submit.");
        }
        throw new Error(
          body.issues?.[0]?.message ?? (res.status === 422 ? "Please check the form for errors." : "Something went wrong. Please try again.")
        );
      }
      clearSoDraft();
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <FormShell brand={BRAND}>
        <FormStatusCard variant="success" title="Submitted for approval" subtitle={`Thanks ${submitterName}, your request is with the first approver.`}>
          <p>
            Each approver is emailed in turn, and the recruitment team&apos;s Google Chat is kept updated. Once the last
            approver signs off it becomes an open role in our pipeline. Updates go to {submitterEmail}.
          </p>
        </FormStatusCard>
      </FormShell>
    );
  }

  // Sign-in comes first: the form only shows once there's a Penda identity.
  // On an expired/rejected token handleSubmit clears `identity`, which lands
  // back here with the reason; the form's state (and draft) is kept.
  if (!identity) {
    return (
      <FormShell brand={BRAND} title="Support Office Requisition Request" subtitle="Sign in to start your request.">
        <RequesterSignInGate
          notice={error}
          onChange={(next) => {
            setIdentity(next);
            if (next) setError(null);
            if (next?.name && !submitterName.trim()) setSubmitterName(next.name);
          }}
        />
      </FormShell>
    );
  }

  return (
    <FormShell brand={BRAND}
      title="Support Office Requisition Request"
      subtitle="Describe the role, and it goes for approval."
    >
      <div className="space-y-6">
        {draftRestored && <DraftRestoredBanner onDiscard={discardDraftAndRestart} />}
        <div className="space-y-4 rounded-lg border border-border p-4">
          <p className="text-sm font-medium">Your details</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Your name</Label>
              <Input value={submitterName} onChange={(e) => setSubmitterName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label>Your role</Label>
              <Input value={submitterRole} onChange={(e) => setSubmitterRole(e.target.value)} required />
            </div>
          </div>
          <RequesterGoogleIdentity
            identity={identity}
            onChange={(next) => {
              setIdentity(next);
              if (next?.name && !submitterName.trim()) setSubmitterName(next.name);
            }}
          />
          {/* Honeypot — hidden from real users via CSS, left blank means non-spam */}
          <input
            type="text"
            name="company_website"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            className="hidden"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        <div className="space-y-4 rounded-lg border border-border p-4">
          <p className="text-sm font-medium">Requisition type</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {SO_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={`text-left rounded-lg border p-3 transition-colors ${
                  type === t.value ? "border-penda-blue bg-penda-blue/5" : "border-border hover:border-penda-blue/50"
                }`}
              >
                <p className="font-medium">{t.label}</p>
                <p className="text-xs text-muted-foreground">{t.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4 rounded-lg border border-border p-4">
          <p className="text-sm font-medium">Role details</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Role title</Label>
              <RoleTitleInput
                value={roleTitle}
                onChange={setRoleTitle}
                suggestions={roleTitleSuggestions}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Select value={department || undefined} onValueChange={setDepartment}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a department" />
                </SelectTrigger>
                <SelectContent>
                  {SO_DEPARTMENTS.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>Level</Label>
              <Select value={level} onValueChange={(v) => setLevel(v as RequisitionLevel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEVELS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Headcount</Label>
              <Input type="number" min={1} value={headcount} onChange={(e) => setHeadcount(Number(e.target.value))} required />
            </div>
            <div className="space-y-1.5">
              <Label>Urgency</Label>
              <Select value={urgency} onValueChange={(v) => setUrgency(v as Priority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {URGENCIES.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Salary range min (optional)</Label>
              <Input
                type="number"
                value={salaryMin}
                onChange={(e) => setSalaryMin(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Salary range max (optional)</Label>
              <Input
                type="number"
                value={salaryMax}
                onChange={(e) => setSalaryMax(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Expected start date</Label>
            <Input type="date" value={expectedStartDate} onChange={(e) => setExpectedStartDate(e.target.value)} />
          </div>

          {isNewRole ? (
            <>
              <div className="space-y-1.5">
                <Label>Justification (min. 100 characters)</Label>
                <Textarea value={justification} onChange={(e) => setJustification(e.target.value)} rows={5} required />
                <p className="text-xs text-muted-foreground">{justification.length}/100 characters minimum</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>JD URL (optional)</Label>
                  <Input value={jdUrl} onChange={(e) => setJdUrl(e.target.value)} placeholder="https://..." />
                </div>
                <div className="space-y-1.5">
                  <Label>Job description</Label>
                  <label className="flex items-center gap-2 h-10 text-sm">
                    <input
                      type="checkbox"
                      checked={jdAttached}
                      onChange={(e) => setJdAttached(e.target.checked)}
                      className="h-4 w-4 rounded border-input"
                    />
                    JD ready to attach
                  </label>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label>Reason for vacancy</Label>
                <Select value={reasonType} onValueChange={(v) => setReasonType(v as VacancyReasonType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REASON_TYPES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Job description</Label>
                <label className="flex items-center gap-2 h-10 text-sm">
                  <input
                    type="checkbox"
                    checked={jdStillCurrent}
                    onChange={(e) => setJdStillCurrent(e.target.checked)}
                    className="h-4 w-4 rounded border-input"
                  />
                  The existing JD is still current
                </label>
              </div>
              <div className="space-y-1.5">
                <Label>{jdStillCurrent ? "Notes (min. 20 characters)" : "Describe the scope change (min. 20 characters)"}</Label>
                <Textarea value={context} onChange={(e) => setContext(e.target.value)} rows={4} required />
              </div>
            </>
          )}
        </div>

        <div className="rounded-lg border border-border p-4">
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              checked={budgetEvaluationConfirmed}
              onChange={(e) => setBudgetEvaluationConfirmed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-input"
            />
            I confirm a budget evaluation has been done for this role.
          </label>
        </div>

        <div className="space-y-2 rounded-lg border border-border p-4">
          <p className="text-sm font-medium">Who approves this</p>
          <ApprovalChainPreview steps={approvers} type={type} />
          <p className="text-xs text-muted-foreground">
            Each approver gets an email in turn. It becomes an open role once the last one approves.
          </p>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button onClick={handleSubmit} disabled={!canSubmit || submitting} className="w-full bg-penda-blue hover:bg-penda-blue-dark">
          {submitting ? "Submitting…" : "Submit for approval"}
        </Button>
      </div>
    </FormShell>
  );
}
