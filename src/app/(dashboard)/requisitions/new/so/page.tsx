"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";
import { RequisitionType, RequisitionLevel, VacancyReasonType, Priority, Requisition } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const SO_TYPES: { value: RequisitionType; label: string; description: string }[] = [
  { value: "SO New Role", label: "New Role", description: "A brand-new support office role that doesn't replace anyone" },
  { value: "SO Replacement", label: "Replacement", description: "Backfilling a role someone has left" },
];

const LEVELS: RequisitionLevel[] = ["Entry", "Junior", "Mid", "Senior", "Lead", "Manager", "Senior Manager", "Head/Director"];
const REASON_TYPES: VacancyReasonType[] = ["Resignation", "Termination", "Internal Promotion", "Retirement", "Contract End", "Other"];
const URGENCIES: Priority[] = ["Critical", "High", "Medium", "Low"];

const NEW_ROLE_CHAIN = ["Hiring Manager", "HOD", "HRBP", "HR Ops", "Director of People"];
const REPLACEMENT_CHAIN = ["Hiring Manager", "HOD", "Director of People"];

export default function NewSoRequisitionPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { createRequisition } = useRecruitmentData();

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

  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const isNewRole = type === "SO New Role";
  const chain = isNewRole ? NEW_ROLE_CHAIN : REPLACEMENT_CHAIN;

  const canSubmit = isNewRole
    ? roleTitle.trim() && department.trim() && justification.trim().length >= 100
    : roleTitle.trim() && department.trim() && context.trim().length >= 20;

  async function handleSubmit() {
    setError(null);
    const req: Requisition = {
      id: `req-${Date.now()}`,
      reqId: "",
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
      status: "Pending Approval",
      approverChain: chain,
      currentApproverIndex: 0,
      submittedBy: user?.name ?? "Unknown",
      submittedAt: new Date().toISOString(),
      expectedStartDate: expectedStartDate || undefined,
      context: isNewRole ? undefined : context,
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
        <h1 className="text-2xl font-semibold">Support Office Requisition</h1>
        <p className="text-sm text-muted-foreground">Request a new support-office role or a replacement for one that&apos;s left.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Requisition type</CardTitle>
        </CardHeader>
        <CardContent>
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
              <Input value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} required />
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Approval chain</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            {chain.map((step, i) => (
              <React.Fragment key={step}>
                <Badge variant="outline">{step}</Badge>
                {i < chain.length - 1 && <span className="text-muted-foreground">→</span>}
              </React.Fragment>
            ))}
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
