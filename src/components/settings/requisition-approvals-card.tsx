"use client";

// Settings → Requisition approvals. A Recruitment Manager sets, separately
// for IPS and SO, the ordered approvers every requisition walks through.
// A step is either a specific Google account (e.g. the Deputy Head of IPS)
// or a role looked up from the request's branch (its Regional Manager or
// Branch Manager). Steps reorder by drag and drop. Also holds the Regional
// Managers directory (RM name on Branches → Google account) and the Google
// Chat webhook. Saved to the App Settings row via PATCH /api/settings; read
// server-side by src/lib/requisitions/approval.ts.
import * as React from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import {
  AppSettings,
  ApprovalStepApproverType,
  Branch,
  RegionalManagerContact,
  RequisitionApprovalStep,
  RequisitionType,
  RequisitionWorkflows,
  Segment,
  User,
} from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  APPROVER_TYPE_LABELS,
  approverTypeOf,
  defaultSteps,
  findRegionalManager,
  newStepId,
  regionalManagerNames,
} from "@/lib/requisitions/workflow";

const SEGMENTS: { segment: Segment; title: string; blurb: string }[] = [
  { segment: "IPS", title: "IPS (clinics)", blurb: "IPS Gap requests from branches." },
  { segment: "SO", title: "SO (support office)", blurb: "Support office new roles and replacements." },
];

// SO is the only segment with more than one requisition type, so it's the
// only one where a step can be limited to some of them.
const SO_SCOPES: { value: string; label: string; appliesTo?: RequisitionType[] }[] = [
  { value: "all", label: "All SO requests" },
  { value: "new", label: "New roles only", appliesTo: ["SO New Role"] },
  { value: "replacement", label: "Replacements only", appliesTo: ["SO Replacement"] },
];

// Branch-based approvers need a branch on the request, which only IPS has.
const IPS_APPROVER_TYPES: ApprovalStepApproverType[] = ["person", "regional_manager", "branch_manager"];

function scopeValue(step: RequisitionApprovalStep): string {
  if (!step.appliesTo?.length || step.appliesTo.length > 1) return "all";
  return step.appliesTo[0] === "SO New Role" ? "new" : "replacement";
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(workflows: RequisitionWorkflows): string | null {
  for (const { segment } of SEGMENTS) {
    const steps = workflows[segment].steps;
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const where = `${segment} step ${i + 1}`;
      if (!step.label.trim()) return `${where} needs a label (e.g. "Deputy Head of IPS").`;
      if (approverTypeOf(step) !== "person") continue;
      if (!step.approverName.trim()) return `${where} needs the approver's name.`;
      if (!EMAIL_RE.test(step.approverEmail.trim())) return `${where} needs a valid Google account email.`;
    }
  }
  for (const rm of workflows.regionalManagers ?? []) {
    if (rm.email.trim() && !EMAIL_RE.test(rm.email.trim())) return `${rm.name}'s Google account isn't a valid email.`;
  }
  return null;
}

function roleHint(type: ApprovalStepApproverType): string {
  return type === "regional_manager"
    ? "Goes to the Regional Manager of the request's branch. Set each RM's Google account under Regional managers below."
    : "Goes to the Branch Manager of the request's branch, using the BM email in Settings → Branches.";
}

function StepRow({
  step,
  index,
  segment,
  isDragging,
  onChange,
  onRemove,
  onDragHandle,
  onKeyMove,
  rowProps,
}: {
  step: RequisitionApprovalStep;
  index: number;
  segment: Segment;
  isDragging: boolean;
  onChange: (patch: Partial<RequisitionApprovalStep>) => void;
  onRemove: () => void;
  onDragHandle: (armed: boolean) => void;
  onKeyMove: (delta: -1 | 1) => void;
  rowProps: React.HTMLAttributes<HTMLDivElement> & { draggable: boolean };
}) {
  const type = approverTypeOf(step);
  return (
    <div
      {...rowProps}
      className={`rounded-md border bg-card p-2.5 transition-opacity ${isDragging ? "opacity-40" : ""}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="cursor-grab touch-none rounded p-1 text-muted-foreground hover:bg-muted active:cursor-grabbing"
          aria-label={`Drag to reorder step ${index + 1}. Arrow keys also move it.`}
          onMouseDown={() => onDragHandle(true)}
          onMouseUp={() => onDragHandle(false)}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
              onKeyMove(e.key === "ArrowUp" ? -1 : 1);
            }
          }}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <span className="w-4 text-xs text-muted-foreground">{index + 1}.</span>
        <Input
          value={step.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="Step (e.g. Deputy Head of IPS)"
          className="w-52"
          aria-label="Step label"
        />
        {segment === "IPS" ? (
          <Select
            value={type}
            onValueChange={(v) =>
              onChange(
                v === "person"
                  ? { approverType: "person" }
                  : { approverType: v as ApprovalStepApproverType, approverName: "", approverEmail: "" }
              )
            }
          >
            <SelectTrigger className="w-52" aria-label="Who approves">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {IPS_APPROVER_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {APPROVER_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Select
            value={scopeValue(step)}
            onValueChange={(v) => onChange({ appliesTo: SO_SCOPES.find((s) => s.value === v)?.appliesTo })}
          >
            <SelectTrigger className="w-44" aria-label="Applies to">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SO_SCOPES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button size="icon" variant="ghost" className="ml-auto" onClick={onRemove} aria-label="Remove step">
          <Trash2 className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
      <div className="mt-2 pl-12">
        {type === "person" ? (
          <div className="flex flex-wrap gap-2">
            <Input
              value={step.approverName}
              onChange={(e) => onChange({ approverName: e.target.value })}
              placeholder="Approver name"
              className="w-52"
              aria-label="Approver name"
            />
            <Input
              type="email"
              list="staff-emails"
              value={step.approverEmail}
              onChange={(e) => onChange({ approverEmail: e.target.value })}
              placeholder="Google account, e.g. name@pendahealth.com"
              className="min-w-56 flex-1"
              aria-label="Approver Google account"
            />
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{roleHint(type)}</p>
        )}
      </div>
    </div>
  );
}

/** Drag-and-drop list of one segment's steps. Reorders live as you drag over rows. */
function StepList({
  segment,
  steps,
  onSteps,
  onChangeStep,
}: {
  segment: Segment;
  steps: RequisitionApprovalStep[];
  onSteps: (fn: (steps: RequisitionApprovalStep[]) => RequisitionApprovalStep[]) => void;
  onChangeStep: (id: string, patch: Partial<RequisitionApprovalStep>) => void;
}) {
  // Rows are only draggable while the grip is held, so dragging never
  // starts from (or breaks text selection in) the inputs.
  const [armedId, setArmedId] = React.useState<string | null>(null);
  const [draggingId, setDraggingId] = React.useState<string | null>(null);

  function moveTo(id: string, targetIndex: number) {
    onSteps((current) => {
      const from = current.findIndex((s) => s.id === id);
      if (from === -1 || from === targetIndex || targetIndex < 0 || targetIndex >= current.length) return current;
      const next = [...current];
      const [moved] = next.splice(from, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }

  if (steps.length === 0) return <p className="py-2 text-xs text-muted-foreground">No approvers. Add at least one step.</p>;

  return (
    <div className="space-y-2">
      {steps.map((step, i) => (
        <StepRow
          key={step.id}
          step={step}
          index={i}
          segment={segment}
          isDragging={draggingId === step.id}
          onChange={(patch) => onChangeStep(step.id, patch)}
          onRemove={() => onSteps((current) => current.filter((s) => s.id !== step.id))}
          onDragHandle={(armed) => setArmedId(armed ? step.id : null)}
          onKeyMove={(delta) => moveTo(step.id, i + delta)}
          rowProps={{
            draggable: armedId === step.id,
            onDragStart: (e) => {
              e.dataTransfer.effectAllowed = "move";
              e.dataTransfer.setData("text/plain", step.id);
              setDraggingId(step.id);
            },
            onDragOver: (e) => {
              if (!draggingId) return; // a drag from the other segment's list
              e.preventDefault();
              if (draggingId !== step.id) moveTo(draggingId, i);
            },
            onDrop: (e) => e.preventDefault(),
            onDragEnd: () => {
              setDraggingId(null);
              setArmedId(null);
            },
          }}
        />
      ))}
    </div>
  );
}

/** RM names come from Branches; this pairs each with the Google account that approves for it. */
function RegionalManagersSection({
  directory,
  branches,
  onChange,
}: {
  directory: RegionalManagerContact[];
  branches: Branch[];
  onChange: (directory: RegionalManagerContact[]) => void;
}) {
  const branchCount = (name: string) =>
    branches.filter((b) => b.active && findRegionalManager(b.regionalManager, [{ name, email: "" }])).length;
  const unmatched = branches.filter(
    (b) => b.active && b.segment !== "SO" && !findRegionalManager(b.regionalManager, directory)
  );

  return (
    <div className="space-y-2 border-t pt-4">
      <p className="text-sm font-medium">Regional managers</p>
      <p className="text-xs text-muted-foreground">
        The names come from each branch&apos;s Regional Manager (Settings → Branches). Add the Google account each one
        approves with. A request is routed using its branch.
      </p>
      {directory.map((rm, i) => (
        <div key={i} className="flex flex-wrap items-center gap-2">
          <Input
            value={rm.name}
            onChange={(e) => onChange(directory.map((r, j) => (j === i ? { ...r, name: e.target.value } : r)))}
            className="w-52"
            aria-label="Regional manager name"
          />
          <Input
            type="email"
            list="staff-emails"
            value={rm.email}
            onChange={(e) => onChange(directory.map((r, j) => (j === i ? { ...r, email: e.target.value } : r)))}
            placeholder="Google account"
            className={`min-w-56 flex-1 ${rm.email.trim() ? "" : "border-amber-400"}`}
            aria-label={`${rm.name} Google account`}
          />
          <span className="w-20 text-xs text-muted-foreground">{branchCount(rm.name)} branches</span>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onChange(directory.filter((_, j) => j !== i))}
            aria-label={`Remove ${rm.name}`}
          >
            <Trash2 className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      ))}
      <Button size="sm" variant="ghost" onClick={() => onChange([...directory, { name: "", email: "" }])}>
        <Plus className="mr-1 h-3.5 w-3.5" /> Add regional manager
      </Button>
      {unmatched.length > 0 && (
        <p className="text-xs text-amber-700">
          No regional manager matched for: {unmatched.map((b) => `${b.name} (${b.regionalManager || "none set"})`).join(", ")}.
        </p>
      )}
    </div>
  );
}

export function RequisitionApprovalsCard({ profiles, branches }: { profiles: User[]; branches: Branch[] }) {
  const [workflows, setWorkflows] = React.useState<RequisitionWorkflows | null>(null);
  const [savedWorkflows, setSavedWorkflows] = React.useState<string>("");
  const [configured, setConfigured] = React.useState(false);
  const [webhookUrl, setWebhookUrl] = React.useState("");
  const [savedWebhookUrl, setSavedWebhookUrl] = React.useState("");
  const [saving, setSaving] = React.useState<"workflows" | "webhook" | null>(null);
  const [testing, setTesting] = React.useState(false);
  const [message, setMessage] = React.useState<{ tone: "ok" | "error"; text: string } | null>(null);

  React.useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data: AppSettings) => {
        const initial = data.requisitionWorkflows ?? { IPS: { steps: defaultSteps("IPS") }, SO: { steps: defaultSteps("SO") } };
        setConfigured(!!data.requisitionWorkflows);
        setWorkflows(initial);
        setSavedWorkflows(JSON.stringify(initial));
        setWebhookUrl(data.requisitionsChatWebhookUrl ?? "");
        setSavedWebhookUrl(data.requisitionsChatWebhookUrl ?? "");
      })
      .catch(() => setMessage({ tone: "error", text: "Failed to load the current approval settings." }));
  }, []);

  // Every RM named on a branch gets a row, even before it's been saved, so
  // filling in the directory is just typing emails.
  const directory = React.useMemo(() => {
    const saved = workflows?.regionalManagers ?? [];
    const missing = regionalManagerNames(branches)
      .filter((name) => !findRegionalManager(name, saved))
      .map((name) => ({ name, email: "" }));
    return [...saved, ...missing];
  }, [workflows?.regionalManagers, branches]);

  function setDirectory(next: RegionalManagerContact[]) {
    setWorkflows((prev) => (prev ? { ...prev, regionalManagers: next } : prev));
    setMessage(null);
  }

  function updateSteps(segment: Segment, fn: (steps: RequisitionApprovalStep[]) => RequisitionApprovalStep[]) {
    setWorkflows((prev) => (prev ? { ...prev, [segment]: { steps: fn(prev[segment].steps) } } : prev));
    setMessage(null);
  }

  function changeStep(segment: Segment, id: string, patch: Partial<RequisitionApprovalStep>) {
    updateSteps(segment, (steps) =>
      steps.map((s) => {
        if (s.id !== id) return s;
        const next = { ...s, ...patch };
        // Picking a known staff email fills in their name if it's still blank.
        if (patch.approverEmail !== undefined && !next.approverName.trim()) {
          const match = profiles.find((p) => p.email.toLowerCase() === patch.approverEmail!.trim().toLowerCase());
          if (match) next.approverName = match.name;
        }
        return next;
      })
    );
  }

  async function patchSettings(body: Record<string, unknown>): Promise<AppSettings> {
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const issue = data.detail?.fieldErrors ? Object.values(data.detail.fieldErrors).flat()[0] : null;
      throw new Error(typeof issue === "string" ? issue : "Failed to save. Please try again.");
    }
    return data as AppSettings;
  }

  async function saveWorkflows() {
    if (!workflows) return;
    const cleanStep = (s: RequisitionApprovalStep): RequisitionApprovalStep =>
      approverTypeOf(s) === "person"
        ? { ...s, approverType: "person", approverEmail: s.approverEmail.trim().toLowerCase() }
        : { ...s, approverName: "", approverEmail: "" };
    const cleaned: RequisitionWorkflows = {
      IPS: { steps: workflows.IPS.steps.map((s) => ({ ...cleanStep(s), appliesTo: undefined })) },
      SO: { steps: workflows.SO.steps.map(cleanStep) },
      // RMs without an email yet aren't saved — they reappear from Branches.
      regionalManagers: directory
        .map((rm) => ({ name: rm.name.trim(), email: rm.email.trim().toLowerCase() }))
        .filter((rm) => rm.name && rm.email),
    };
    const problem = validate({ ...cleaned, regionalManagers: directory });
    if (problem) {
      setMessage({ tone: "error", text: problem });
      return;
    }
    setSaving("workflows");
    setMessage(null);
    try {
      const data = await patchSettings({ requisitionWorkflows: cleaned });
      const saved = data.requisitionWorkflows ?? cleaned;
      setWorkflows(saved);
      setSavedWorkflows(JSON.stringify(saved));
      setConfigured(true);
      const usesRm = saved.IPS.steps.some((s) => approverTypeOf(s) === "regional_manager");
      const missingRm = directory.filter((rm) => rm.name.trim() && !rm.email.trim()).length;
      setMessage({
        tone: "ok",
        text:
          `Approvers saved. New requests will use them; requests already in progress keep their original approvers.` +
          (usesRm && missingRm ? ` ${missingRm} regional manager(s) still need a Google account.` : ""),
      });
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "Failed to save." });
    } finally {
      setSaving(null);
    }
  }

  async function saveWebhook() {
    setSaving("webhook");
    setMessage(null);
    try {
      const data = await patchSettings({ requisitionsChatWebhookUrl: webhookUrl.trim() });
      setWebhookUrl(data.requisitionsChatWebhookUrl ?? "");
      setSavedWebhookUrl(data.requisitionsChatWebhookUrl ?? "");
      setMessage({ tone: "ok", text: webhookUrl.trim() ? "Google Chat webhook saved." : "Google Chat webhook cleared." });
    } catch (err) {
      setMessage({ tone: "error", text: err instanceof Error ? err.message : "Failed to save." });
    } finally {
      setSaving(null);
    }
  }

  async function sendTest() {
    setTesting(true);
    setMessage(null);
    try {
      const res = await fetch("/api/settings/test-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhookUrl: webhookUrl.trim() || undefined }),
      });
      setMessage(
        res.ok
          ? { tone: "ok", text: "Test message sent — check the Google Chat space." }
          : { tone: "error", text: "Google Chat didn't accept that webhook URL. Copy it again from the space's Webhooks settings." }
      );
    } finally {
      setTesting(false);
    }
  }

  const workflowsDirty = workflows !== null && JSON.stringify(workflows) !== savedWorkflows;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Requisition approvals</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-xs text-muted-foreground">
          Every requisition, whether from the in-app forms or the public request links, goes through these approvers
          in order. Drag the handle to reorder. Each approver gets an email link and must sign in with their Google
          account to approve or reject. If the requester is one of the approvers, their step is skipped. Once the last
          approver signs off, the request becomes an Open Role.
        </p>
        {!configured && workflows && (
          <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-800">
            Not set up yet. The steps below are suggestions. Fill in the approvers and save. Until then, new requests
            wait for a Recruitment Manager to approve them in the app.
          </p>
        )}

        <datalist id="staff-emails">
          {profiles.map((p) => (
            <option key={p.id} value={p.email}>
              {p.name}
            </option>
          ))}
        </datalist>

        {!workflows ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            {SEGMENTS.map(({ segment, title, blurb }) => (
              <div key={segment} className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-medium">{title}</p>
                  <p className="text-xs text-muted-foreground">{blurb}</p>
                </div>
                <StepList
                  segment={segment}
                  steps={workflows[segment].steps}
                  onSteps={(fn) => updateSteps(segment, fn)}
                  onChangeStep={(id, patch) => changeStep(segment, id, patch)}
                />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    updateSteps(segment, (steps) => [
                      ...steps,
                      { id: newStepId(), label: "", approverType: "person", approverName: "", approverEmail: "" },
                    ])
                  }
                >
                  <Plus className="mr-1 h-3.5 w-3.5" /> Add step
                </Button>
              </div>
            ))}
            <RegionalManagersSection directory={directory} branches={branches} onChange={setDirectory} />
          </>
        )}

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            disabled={!workflows || saving !== null || (!workflowsDirty && configured)}
            onClick={saveWorkflows}
            className="bg-penda-blue hover:bg-penda-blue-dark"
          >
            {saving === "workflows" ? "Saving…" : "Save approvers"}
          </Button>
        </div>

        <div className="space-y-2 border-t pt-4">
          <p className="text-sm font-medium">Google Chat notifications</p>
          <p className="text-xs text-muted-foreground">
            Every new request, approval, rejection and new Open Role is posted to this space, threaded per requisition.
            In Google Chat: open the space → Apps &amp; integrations → Webhooks → add one, then paste its URL here.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://chat.googleapis.com/v1/spaces/…"
              className="min-w-64 flex-1"
            />
            <Button
              size="sm"
              disabled={saving !== null || webhookUrl.trim() === savedWebhookUrl}
              onClick={saveWebhook}
              className="bg-penda-blue hover:bg-penda-blue-dark"
            >
              {saving === "webhook" ? "Saving…" : "Save"}
            </Button>
            <Button size="sm" variant="outline" disabled={testing || !webhookUrl.trim()} onClick={sendTest}>
              {testing ? "Sending…" : "Send test message"}
            </Button>
          </div>
        </div>

        {message && (
          <p className={`text-xs ${message.tone === "ok" ? "text-emerald-600" : "text-destructive"}`}>{message.text}</p>
        )}
      </CardContent>
    </Card>
  );
}
