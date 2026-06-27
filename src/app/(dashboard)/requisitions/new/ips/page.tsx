"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const { user } = useAuth();
  const { createRequisition, branches, openRoles } = useRecruitmentData();

  const roleTitleSuggestions = React.useMemo(() => {
    const existing = openRoles.filter((r) => r.segment === "IPS").map((r) => r.title);
    return Array.from(new Set([...IPS_ROLES, ...existing])).sort((a, b) => a.localeCompare(b));
  }, [openRoles]);

  const [gapReason, setGapReason] = React.useState<GapReason>("New Addition");
  const [roleTitle, setRoleTitle] = React.useState("");
  const [department, setDepartment] = React.useState("");
  const [branchId, setBranchId] = React.useState(branches[0]?.id ?? "");
  const [employmentType, setEmploymentType] = React.useState<EmploymentType>("Full-time");
  const [headcount, setHeadcount] = React.useState(1);
  const [urgency, setUrgency] = React.useState<Priority>("Medium");
  const [expectedStartDate, setExpectedStartDate] = React.useState("");
  const [context, setContext] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!branchId && branches[0]) setBranchId(branches[0].id);
  }, [branches, branchId]);

  const canSubmit = roleTitle.trim() && department.trim() && branchId && context.trim().length >= 20;

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
      branchId,
      employmentType,
      headcount,
      justification: context,
      urgency,
      jdAttached: false,
      status: "Pending Approval",
      approverChain: ["Recruiter", "TA Manager"],
      currentApproverIndex: 0,
      submittedBy: user?.name ?? "Unknown",
      submittedAt: new Date().toISOString(),
      expectedStartDate: expectedStartDate || undefined,
      context,
    };
    setSubmitting(true);
    try {
      await createRequisition(req);
      router.push("/requisitions");
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
                  gapReason === r.value ? "border-penda-teal bg-penda-teal/5" : "border-border hover:border-penda-teal/50"
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
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger>
                  <SelectValue />
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
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex gap-3">
        <Button onClick={handleSubmit} disabled={!canSubmit || submitting} className="bg-penda-teal hover:bg-penda-teal-dark">
          {submitting ? "Submitting…" : "Submit for approval"}
        </Button>
        <Button variant="outline" onClick={() => router.push("/requisitions")}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
