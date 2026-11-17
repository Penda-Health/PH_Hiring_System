"use client";

// The public "raise a gap" form, shared by /requisition-request/ips (any IPS
// branch) and /requisition-request/call-centre (the call centre: SO segment,
// "Pigia Penda / Call Centre" department, its own BM → HRBP → RM chain).
import * as React from "react";
import { GapReason, EmploymentType, Priority, RequisitionType } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FormShell, FormStatusCard, DraftRestoredBanner, type FormShellBrand } from "@/components/forms/form-shell";
import { RoleTitleInput } from "@/components/requisitions/role-title-input";
import { RequesterGoogleIdentity, RequesterSignInGate, type RequesterIdentity } from "@/components/requisitions/requester-google-identity";
import { ApprovalChainPreview } from "@/components/requisitions/approval-chain-preview";
import { CALL_CENTRE_DEPARTMENT, type WorkflowPreviewStep } from "@/lib/requisitions/workflow";
import { IPS_FUNCTIONS } from "@/lib/department-options";
import { gapDraftStore } from "@/lib/forms/requisition-request-draft";

export type GapRequestVariant = "ips" | "call-centre";

const LEDE = "Your request goes to each approver in turn and enters the hiring pipeline once the last one signs off.";

const VARIANTS = {
  ips: {
    brand: { eyebrow: "Penda Health · IPS Requisition", headline: "Raise a staffing gap for approval.", lede: LEDE, footer: "Questions? careers@pendahealth.com" },
    title: "IPS Gap Requisition Request",
    apiSegment: "IPS",
    roleSuggestions: ["Nurse", "Clinical Officer", "Pharmacist", "Lab Technician", "Pharmacy Technician"],
    place: "branch",
  },
  "call-centre": {
    brand: {
      eyebrow: "Penda Health · Call Centre Requisition",
      headline: "Raise a call centre staffing gap.",
      lede: `${LEDE} The HRBP confirms the gap along the way.`,
      footer: "Questions? careers@pendahealth.com",
    },
    title: "Call Centre Requisition Request",
    apiSegment: "CallCentre",
    roleSuggestions: ["Call Centre Agent"],
    place: "call centre",
  },
} satisfies Record<GapRequestVariant, { brand: FormShellBrand; title: string; apiSegment: string; roleSuggestions: string[]; place: string }>;

/** What the request is filed as. A call centre gap is an SO request in the call centre department. */
function requestShape(variant: GapRequestVariant, gapReason: GapReason): { segment: "IPS" | "SO"; type: RequisitionType } {
  if (variant === "ips") return { segment: "IPS", type: "IPS Gap" };
  return { segment: "SO", type: gapReason === "New Addition" ? "SO New Role" : "SO Replacement" };
}

const GAP_REASONS: { value: GapReason; label: string; description: string }[] = [
  { value: "Transfer", label: "Transfer", description: "Employee moved to a different branch or department" },
  { value: "Promotion", label: "Promotion", description: "Employee promoted into a different role" },
  { value: "Voluntary Resignation", label: "Resignation", description: "Employee voluntarily left" },
  { value: "Termination", label: "Termination", description: "Employee was let go" },
  { value: "New Addition", label: "New Addition", description: "A brand new headcount, not a replacement" },
];

const EMPLOYMENT_TYPES: EmploymentType[] = ["Full-time", "Part-time", "Contract", "Reliever", "Locum"];
const URGENCIES: Priority[] = ["Critical", "High", "Medium", "Low"];

type Branch = { id: string; name: string; city: string; regionalManager?: string; branchManager?: string };

export function GapRequestForm({ variant }: { variant: GapRequestVariant }) {
  const config = VARIANTS[variant];
  const BRAND = config.brand;
  const isCallCentre = variant === "call-centre";
  const { load: loadIpsDraft, save: saveIpsDraft, clear: clearIpsDraft } = gapDraftStore(variant);
  const [branches, setBranches] = React.useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = React.useState(true);
  const [roleTitleSuggestions, setRoleTitleSuggestions] = React.useState<string[]>(config.roleSuggestions);

  const [submitterName, setSubmitterName] = React.useState("");
  // Google sign-in, not a typed email — see RequesterGoogleIdentity.
  const [identity, setIdentity] = React.useState<RequesterIdentity | null>(null);
  const submitterEmail = identity?.email ?? "";
  const [approvers, setApprovers] = React.useState<WorkflowPreviewStep[] | null>(null);
  const [submitterRole, setSubmitterRole] = React.useState("");
  const [honeypot, setHoneypot] = React.useState("");

  const [gapReason, setGapReason] = React.useState<GapReason>("New Addition");
  const [roleTitle, setRoleTitle] = React.useState("");
  const [department, setDepartment] = React.useState(isCallCentre ? CALL_CENTRE_DEPARTMENT : "");
  const [branchId, setBranchId] = React.useState("");
  const [employmentType, setEmploymentType] = React.useState<EmploymentType>("Full-time");
  const [headcount, setHeadcount] = React.useState(1);
  // Staffing context for approvers — both about this role/cadre at the branch.
  const [currentHeadcount, setCurrentHeadcount] = React.useState<number | "">("");
  const [labourModelHeadcount, setLabourModelHeadcount] = React.useState<number | "">("");
  const [urgency, setUrgency] = React.useState<Priority>("Medium");
  const [expectedStartDate, setExpectedStartDate] = React.useState("");
  const [context, setContext] = React.useState("");

  const [submitting, setSubmitting] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [draftRestored, setDraftRestored] = React.useState(false);

  React.useEffect(() => {
    fetch(`/api/public/requisition-request?segment=${config.apiSegment}`)
      .then((res) => res.json())
      .then((body) => {
        const loaded: Branch[] = body.branches ?? [];
        setBranches(loaded);
        // The call centre is one place — pick it rather than asking.
        if (isCallCentre && loaded.length === 1) setBranchId(loaded[0].id);
        setApprovers(body.approvers ?? []);
        setRoleTitleSuggestions(
          Array.from(new Set([...config.roleSuggestions, ...(body.roleTitles ?? [])])).sort((a, b) => a.localeCompare(b))
        );

        const draft = loadIpsDraft();
        if (draft) {
          setSubmitterName(draft.submitterName);
              setSubmitterRole(draft.submitterRole);
          setGapReason(draft.gapReason as GapReason);
          setRoleTitle(draft.roleTitle);
          if (!isCallCentre) {
            setDepartment(draft.department);
            setBranchId(draft.branchId || "");
          }
          setEmploymentType(draft.employmentType as EmploymentType);
          setHeadcount(draft.headcount);
          setCurrentHeadcount(draft.currentHeadcount ?? "");
          setLabourModelHeadcount(draft.labourModelHeadcount ?? "");
          setUrgency(draft.urgency as Priority);
          setExpectedStartDate(draft.expectedStartDate);
          setContext(draft.context);
          setDraftRestored(true);
        }
      })
      .finally(() => setBranchesLoading(false));
    // Runs once per mount; config/variant are fixed for the page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced autosave — only once there's something worth restoring.
  React.useEffect(() => {
    if (submitted) return;
    const hasContent = submitterName.trim() || roleTitle.trim() || context.trim();
    if (!hasContent) return;
    const handle = setTimeout(() => {
      saveIpsDraft({
        submitterName,
        submitterEmail,
        submitterRole,
        gapReason,
        roleTitle,
        department,
        branchId,
        employmentType,
        headcount,
        currentHeadcount,
        labourModelHeadcount,
        urgency,
        expectedStartDate,
        context,
      });
    }, 500);
    return () => clearTimeout(handle);
  }, [
    submitted,
    submitterName,
    submitterEmail,
    submitterRole,
    gapReason,
    roleTitle,
    department,
    branchId,
    employmentType,
    headcount,
    currentHeadcount,
    labourModelHeadcount,
    urgency,
    expectedStartDate,
    context,
    saveIpsDraft,
  ]);

  function discardDraftAndRestart() {
    clearIpsDraft();
    setDraftRestored(false);
    setSubmitterName("");
    setSubmitterRole("");
    setGapReason("New Addition");
    setRoleTitle("");
    if (!isCallCentre) {
      setDepartment("");
      setBranchId("");
    }
    setEmploymentType("Full-time");
    setHeadcount(1);
    setCurrentHeadcount("");
    setLabourModelHeadcount("");
    setUrgency("Medium");
    setExpectedStartDate("");
    setContext("");
  }

  const canSubmit =
    submitterName.trim() &&
    identity &&
    submitterRole.trim() &&
    roleTitle.trim() &&
    department.trim() &&
    (branchId || isCallCentre) &&
    currentHeadcount !== "" &&
    labourModelHeadcount !== "" &&
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
          credential: identity?.credential,
          submitterRole,
          honeypot,
          ...requestShape(variant, gapReason),
          roleTitle: roleTitle.trim(),
          department,
          gapReason,
          branchId: branchId || undefined,
          employmentType,
          headcount,
          currentHeadcount: currentHeadcount === "" ? undefined : currentHeadcount,
          labourModelHeadcount: labourModelHeadcount === "" ? undefined : labourModelHeadcount,
          justification: context,
          urgency,
          jdAttached: false,
          expectedStartDate: expectedStartDate || undefined,
          context,
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
      clearIpsDraft();
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
      <FormShell brand={BRAND} title={config.title} subtitle="Sign in to start your request.">
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
      title={config.title}
      subtitle="Describe the gap, and it goes for approval."
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
                  gapReason === r.value ? "border-penda-blue bg-penda-blue/5" : "border-border hover:border-penda-blue/50"
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
              {isCallCentre ? (
                <Input value={department} readOnly disabled />
              ) : (
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
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label>{isCallCentre ? "Location" : "Branch"}</Label>
              <Select value={branchId} onValueChange={setBranchId} disabled={branchesLoading || isCallCentre}>
                <SelectTrigger>
                  <SelectValue placeholder={branchesLoading ? "Loading…" : isCallCentre ? "Call Centre" : "Select a branch"} />
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
              <Input type="number" min={0.5} step={0.5} value={headcount} onChange={(e) => setHeadcount(Number(e.target.value))} required />
              <p className="text-xs text-muted-foreground">0.5 for a role shared across a cluster.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>How many {roleTitle.trim() || "of this role/cadre"} do you have currently?</Label>
              <Input
                type="number"
                min={0}
                step={0.5}
                value={currentHeadcount}
                onChange={(e) => setCurrentHeadcount(e.target.value === "" ? "" : Number(e.target.value))}
                required
              />
              <p className="text-xs text-muted-foreground">
                Exclude anyone with a planned exit (e.g. the person being replaced). Use 0.5 for someone shared with a
                clustered branch.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Optimum staffing per the labour model (last 3 months)</Label>
              <Input
                type="number"
                min={0}
                step="0.1"
                value={labourModelHeadcount}
                onChange={(e) => setLabourModelHeadcount(e.target.value === "" ? "" : Number(e.target.value))}
                required
              />
              <p className="text-xs text-muted-foreground">How many of this role the labour model says the {config.place} needs.</p>
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
        </div>

        <div className="space-y-2 rounded-lg border border-border p-4">
          <p className="text-sm font-medium">Who approves this</p>
          <ApprovalChainPreview
            steps={approvers}
            type={requestShape(variant, gapReason).type}
            branch={branches.find((b) => b.id === branchId)}
          />
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
