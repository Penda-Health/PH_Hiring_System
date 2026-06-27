"use client";

import * as React from "react";
import { GapReason, EmploymentType, Priority } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormShell, FormMessage } from "@/components/forms/form-shell";
import { RoleTitleInput } from "@/components/requisitions/role-title-input";

const GAP_REASONS: { value: GapReason; label: string; description: string }[] = [
  { value: "Transfer", label: "Transfer", description: "Employee moved to a different branch or department" },
  { value: "Promotion", label: "Promotion", description: "Employee promoted into a different role" },
  { value: "Voluntary Resignation", label: "Resignation", description: "Employee voluntarily left" },
  { value: "Termination", label: "Termination", description: "Employee was let go" },
  { value: "New Addition", label: "New Addition", description: "A brand new headcount, not a replacement" },
];

const IPS_ROLES = ["Nurse", "Clinical Officer", "Pharmacist", "Lab Technician", "Pharmacy Technician"];
const EMPLOYMENT_TYPES: EmploymentType[] = ["Full-time", "Part-time", "Contract", "Reliever", "Locum"];
const URGENCIES: Priority[] = ["Critical", "High", "Medium", "Low"];
const PENDA_EMAIL_DOMAIN = "@pendahealth.com";

type Branch = { id: string; name: string; city: string };

export default function PublicIpsRequisitionRequestPage() {
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = React.useState(true);
  const [roleTitleSuggestions, setRoleTitleSuggestions] = React.useState<string[]>(IPS_ROLES);

  const [submitterName, setSubmitterName] = React.useState("");
  const [submitterEmail, setSubmitterEmail] = React.useState("");
  const [submitterRole, setSubmitterRole] = React.useState("");
  const [honeypot, setHoneypot] = React.useState("");

  const [gapReason, setGapReason] = React.useState<GapReason>("New Addition");
  const [roleTitle, setRoleTitle] = React.useState("");
  const [department, setDepartment] = React.useState("");
  const [branchId, setBranchId] = React.useState("");
  const [employmentType, setEmploymentType] = React.useState<EmploymentType>("Full-time");
  const [headcount, setHeadcount] = React.useState(1);
  const [urgency, setUrgency] = React.useState<Priority>("Medium");
  const [expectedStartDate, setExpectedStartDate] = React.useState("");
  const [context, setContext] = React.useState("");

  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/public/requisition-request?segment=IPS")
      .then((res) => res.json())
      .then((body) => {
        setBranches(body.branches ?? []);
        if (body.branches?.[0]) setBranchId(body.branches[0].id);
        setRoleTitleSuggestions(Array.from(new Set([...IPS_ROLES, ...(body.roleTitles ?? [])])).sort((a, b) => a.localeCompare(b)));
      })
      .finally(() => setBranchesLoading(false));
  }, []);

  const emailValid = submitterEmail.trim().toLowerCase().endsWith(PENDA_EMAIL_DOMAIN);
  const canSubmit =
    submitterName.trim() &&
    emailValid &&
    submitterRole.trim() &&
    roleTitle.trim() &&
    department.trim() &&
    branchId &&
    context.trim().length >= 20;

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
          type: "IPS Gap",
          roleTitle: roleTitle.trim(),
          department,
          segment: "IPS",
          gapReason,
          branchId,
          employmentType,
          headcount,
          justification: context,
          urgency,
          jdAttached: false,
          expectedStartDate: expectedStartDate || undefined,
          context,
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
      title="IPS Gap Requisition Request"
      subtitle="Use this link once the role's approval is complete over email."
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
          <p className="text-sm font-medium">Reason for vacancy</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {GAP_REASONS.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setGapReason(r.value)}
                className={`text-left rounded-lg border p-3 transition-colors ${
                  gapReason === r.value ? "border-penda-teal bg-penda-teal/5" : "border-border hover:border-penda-teal/50"
                }`}
              >
                <p className="font-medium">{r.label}</p>
                <p className="text-xs text-muted-foreground">{r.description}</p>
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
              <Label>Branch</Label>
              <Select value={branchId} onValueChange={setBranchId} disabled={branchesLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={branchesLoading ? "Loading…" : "Select a branch"} />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Employment type</Label>
              <Select value={employmentType} onValueChange={(v) => setEmploymentType(v as EmploymentType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Headcount</Label>
              <Input type="number" min={1} value={headcount} onChange={(e) => setHeadcount(Number(e.target.value))} required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Urgency</Label>
              <div className="grid grid-cols-2 gap-2">
                {URGENCIES.map((u) => (
                  <button
                    key={u}
                    type="button"
                    onClick={() => setUrgency(u)}
                    className={`rounded-md border px-3 py-2 text-sm transition-colors ${
                      urgency === u ? "border-penda-teal bg-penda-teal/5" : "border-border hover:border-penda-teal/50"
                    }`}
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Expected start date</Label>
              <Input type="date" value={expectedStartDate} onChange={(e) => setExpectedStartDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Context for this request (min. 20 characters)</Label>
            <Textarea value={context} onChange={(e) => setContext(e.target.value)} rows={4} required />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button onClick={handleSubmit} disabled={!canSubmit || submitting} className="w-full bg-penda-teal hover:bg-penda-teal-dark">
          {submitting ? "Submitting…" : "Submit requisition"}
        </Button>
      </div>
    </FormShell>
  );
}
