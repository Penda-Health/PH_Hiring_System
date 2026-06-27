"use client";

import * as React from "react";
import { RequisitionType, RequisitionLevel, VacancyReasonType, Priority } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormShell, FormMessage } from "@/components/forms/form-shell";
import { RoleTitleInput } from "@/components/requisitions/role-title-input";

const SO_TYPES: { value: RequisitionType; label: string; description: string }[] = [
  { value: "SO New Role", label: "New Role", description: "A brand-new support office role that doesn't replace anyone" },
  { value: "SO Replacement", label: "Replacement", description: "Backfilling a role someone has left" },
];

const LEVELS: RequisitionLevel[] = ["Entry", "Junior", "Mid", "Senior", "Lead", "Manager", "Senior Manager", "Head/Director"];
const REASON_TYPES: VacancyReasonType[] = ["Resignation", "Termination", "Internal Promotion", "Retirement", "Contract End", "Other"];
const URGENCIES: Priority[] = ["Critical", "High", "Medium", "Low"];
const PENDA_EMAIL_DOMAIN = "@pendahealth.com";

export default function PublicSoRequisitionRequestPage() {
  const [submitterName, setSubmitterName] = React.useState("");
  const [submitterEmail, setSubmitterEmail] = React.useState("");
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

  React.useEffect(() => {
    fetch("/api/public/requisition-request?segment=SO")
      .then((res) => res.json())
      .then((body) => setRoleTitleSuggestions(body.roleTitles ?? []))
      .catch(() => {});
  }, []);

  const isNewRole = type === "SO New Role";

  const emailValid = submitterEmail.trim().toLowerCase().endsWith(PENDA_EMAIL_DOMAIN);
  const canSubmit =
    submitterName.trim() &&
    emailValid &&
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
          submitterEmail,
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
        throw new Error(
          body.issues?.[0]?.message ?? (res.status === 422 ? "Please check the form for errors." : "Something went wrong. Please try again.")
        );
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <FormShell title="Request received" subtitle={`Thanks ${submitterName}, your requisition has been created.`}>
        <FormMessage>
          <p>The role is now an open role in our pipeline. You&apos;ll receive email updates at {submitterEmail} as it progresses.</p>
        </FormMessage>
      </FormShell>
    );
  }

  return (
    <FormShell
      title="Support Office Requisition Request"
      subtitle="Use this link once the role's budget evaluation and approval are complete over email."
    >
      <div className="space-y-6">
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
          <div className="space-y-1.5">
            <Label>Your work email</Label>
            <Input type="email" value={submitterEmail} onChange={(e) => setSubmitterEmail(e.target.value)} required />
            {submitterEmail.trim() && !emailValid && (
              <p className="text-xs text-destructive">Must be a {PENDA_EMAIL_DOMAIN} email address.</p>
            )}
          </div>
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
                  type === t.value ? "border-penda-teal bg-penda-teal/5" : "border-border hover:border-penda-teal/50"
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
              <Input value={department} onChange={(e) => setDepartment(e.target.value)} required />
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
            I confirm budget evaluation and email approval for this role are complete.
          </label>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button onClick={handleSubmit} disabled={!canSubmit || submitting} className="w-full bg-penda-teal hover:bg-penda-teal-dark">
          {submitting ? "Submitting…" : "Submit requisition"}
        </Button>
      </div>
    </FormShell>
  );
}
