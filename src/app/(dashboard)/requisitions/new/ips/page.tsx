"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";
import { GapReason, EmploymentType, Priority, Requisition } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RoleTitleInput } from "@/components/requisitions/role-title-input";
import { IPS_FUNCTIONS } from "@/lib/department-options";
import { ApprovalChainPreview, useWorkflowPreview } from "@/components/requisitions/approval-chain-preview";
import { isFloatingEmploymentType } from "@/lib/requisitions-helpers";

// Select can't hold an empty value, so "no specific branch" gets a sentinel.
const NO_BRANCH = "__none";

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

export default function NewIpsGapRequisitionPage() {
  return (
    <React.Suspense fallback={null}>
      <NewIpsGapRequisitionForm />
    </React.Suspense>
  );
}

function NewIpsGapRequisitionForm() {
  const router = useRouter();
  const { user } = useAuth();
  const { createRequisition, updateOpenRole, branches, openRoles, refresh } = useRecruitmentData();
  const searchParams = useSearchParams();
  // Set when this requisition is being raised to backfill a seat vacated by
  // an internal move into an expansion role — see ReplacementRequisitionPicker.
  // On submit we link it back to that role and land on the Expansion Tracker
  // instead of the generic Requisition Intake list.
  const linkRoleId = searchParams.get("linkRoleId");

  const roleTitleSuggestions = React.useMemo(() => {
    const existing = openRoles.filter((r) => r.segment === "IPS").map((r) => r.title);
    return Array.from(new Set([...IPS_ROLES, ...existing])).sort((a, b) => a.localeCompare(b));
  }, [openRoles]);

  const gapReasonParam = searchParams.get("gapReason");
  const initialGapReason: GapReason =
    gapReasonParam === "Transfer" || gapReasonParam === "Promotion" ? gapReasonParam : "New Addition";
  const [gapReason, setGapReason] = React.useState<GapReason>(initialGapReason);
  const [roleTitle, setRoleTitle] = React.useState("");
  const [department, setDepartment] = React.useState("");
  // This page only raises IPS requisitions — scope the branch picker to active
  // IPS clinics so SO-only locations (Support Office, Telemedicine) and closed
  // branches don't show up. No branch is preselected: a silent default is
  // easy to submit by mistake.
  const ipsBranches = React.useMemo(
    () => branches.filter((b) => b.segment === "IPS" && b.active).sort((a, b) => a.name.localeCompare(b.name)),
    [branches]
  );
  const [branchId, setBranchId] = React.useState("");
  const [employmentType, setEmploymentType] = React.useState<EmploymentType>("Full-time");
  const [headcount, setHeadcount] = React.useState(1);
  const [urgency, setUrgency] = React.useState<Priority>("Medium");
  const [expectedStartDate, setExpectedStartDate] = React.useState("");
  const [context, setContext] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const workflowPreview = useWorkflowPreview();

  // Part-time/Locum/Reliever staff float between clinics: the branch is
  // optional and, raised in-app, the request skips approval.
  const floating = isFloatingEmploymentType(employmentType);
  const hasBranch = !!branchId && branchId !== NO_BRANCH;
  React.useEffect(() => {
    if (!floating && branchId === NO_BRANCH) setBranchId("");
  }, [floating, branchId]);

  const canSubmit = roleTitle.trim() && department.trim() && (hasBranch || floating) && context.trim().length >= 20;

  async function handleSubmit() {
    setError(null);
    const req: Requisition = {
      id: `req-${Date.now()}`,
      reqId: "",
      type: "IPS Gap",
      roleTitle: roleTitle.trim(),
      department,
      segment: "IPS",
      gapReason,
      branchId: hasBranch ? branchId : undefined,
      employmentType,
      headcount,
      justification: context,
      urgency,
      jdAttached: false,
      status: "Pending Approval",
      // Assigned server-side from Settings → Requisition approvals.
      approverChain: [],
      currentApproverIndex: 0,
      submittedBy: user?.name ?? "Unknown",
      submittedAt: new Date().toISOString(),
      expectedStartDate: expectedStartDate || undefined,
      context,
    };
    setSubmitting(true);
    try {
      const created = await createRequisition(req);
      // The Open Role was created server-side — pull it into the register.
      if (floating) void refresh();
      if (linkRoleId) {
        updateOpenRole(linkRoleId, { replacementRequisitionId: created.id });
        router.push("/expansion");
      } else {
        router.push("/requisitions");
      }
    } catch {
      setError("Something went wrong submitting this requisition. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">IPS Gap Requisition</h1>
        <p className="text-sm text-muted-foreground">Request a replacement or new headcount for an in-patient services role.</p>
      </div>

      {linkRoleId && (
        <div className="rounded-md border border-penda-blue/30 bg-penda-blue/5 px-3 py-2 text-sm text-penda-blue">
          Submitting this will automatically link it as the replacement requisition on the Expansion Tracker role you came from.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Reason for vacancy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {GAP_REASONS.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setGapReason(r.value)}
                className={`text-left rounded-lg border p-3 transition-colors ${
                  gapReason === r.value ? "border-penda-blue bg-penda-blue/5" : "border-border hover:border-penda-blue/50"
                }`}
              >
                <p className="font-medium">{r.label}</p>
                <p className="text-xs text-muted-foreground">{r.description}</p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Role details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
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
                  <SelectValue placeholder="Select a function" />
                </SelectTrigger>
                <SelectContent>
                  {IPS_FUNCTIONS.map((d) => (
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
              <Label>Branch</Label>
              <Select value={branchId || undefined} onValueChange={setBranchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a branch" />
                </SelectTrigger>
                <SelectContent>
                  {floating && <SelectItem value={NO_BRANCH}>No specific branch</SelectItem>}
                  {ipsBranches.map((b) => (
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
              <Input type="number" min={0.5} step={0.5} value={headcount} onChange={(e) => setHeadcount(Number(e.target.value))} required />
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
                      urgency === u ? "border-penda-blue bg-penda-blue/5" : "border-border hover:border-penda-blue/50"
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Approval chain</CardTitle>
        </CardHeader>
        <CardContent>
          {floating ? (
            <p className="text-sm text-muted-foreground">
              No approval needed — {employmentType} requests raised here become an Open Role as soon as you submit.
            </p>
          ) : (
            <ApprovalChainPreview
              steps={workflowPreview?.IPS ?? null}
              type="IPS Gap"
              branch={ipsBranches.find((b) => b.id === branchId)}
            />
          )}
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <Button onClick={handleSubmit} disabled={!canSubmit || submitting} className="bg-penda-blue hover:bg-penda-blue-dark">
          {submitting ? "Submitting…" : floating ? "Create open role" : "Submit for approval"}
        </Button>
        <Button variant="outline" onClick={() => router.push("/requisitions")}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
