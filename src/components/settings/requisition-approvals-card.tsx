"use client";

// Settings → Requisition approvals. A Recruitment Manager sets, separately
// for IPS and SO, the ordered approvers every requisition walks through
// (each one a specific Google account), plus the Google Chat space that
// hears about every request and decision. Saved to the App Settings row via
// PATCH /api/settings; read server-side by src/lib/requisitions/approval.ts.
import * as React from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { AppSettings, RequisitionApprovalStep, RequisitionType, RequisitionWorkflows, Segment, User } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { defaultSteps, newStepId } from "@/lib/requisitions/workflow";

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
      if (!step.label.trim()) return `${where} needs a label (e.g. "HOD").`;
      if (!step.approverName.trim()) return `${where} needs the approver's name.`;
      if (!EMAIL_RE.test(step.approverEmail.trim())) return `${where} needs a valid Google account email.`;
    }
  }
  return null;
}

function StepRow({
  step,
  index,
  count,
  segment,
  onChange,
  onMove,
  onRemove,
}: {
  step: RequisitionApprovalStep;
  index: number;
  count: number;
  segment: Segment;
  onChange: (patch: Partial<RequisitionApprovalStep>) => void;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b py-2.5 last:border-b-0">
      <span className="w-5 shrink-0 text-xs text-muted-foreground">{index + 1}.</span>
      <Input
        value={step.label}
        onChange={(e) => onChange({ label: e.target.value })}
        placeholder="Step (e.g. HOD)"
        className="w-36"
        aria-label="Step label"
      />
      <Input
        value={step.approverName}
        onChange={(e) => onChange({ approverName: e.target.value })}
        placeholder="Approver name"
        className="w-40"
        aria-label="Approver name"
      />
      <Input
        type="email"
        list="staff-emails"
        value={step.approverEmail}
        onChange={(e) => onChange({ approverEmail: e.target.value })}
        placeholder="name@pendahealth.com"
        className="min-w-48 flex-1"
        aria-label="Approver Google account"
      />
      {segment === "SO" && (
        <Select
          value={scopeValue(step)}
          onValueChange={(v) => onChange({ appliesTo: SO_SCOPES.find((s) => s.value === v)?.appliesTo })}
        >
          <SelectTrigger className="w-40">
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
      <div className="flex items-center">
        <Button size="icon" variant="ghost" disabled={index === 0} onClick={() => onMove(-1)} aria-label="Move up">
          <ArrowUp className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" disabled={index === count - 1} onClick={() => onMove(1)} aria-label="Move down">
          <ArrowDown className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={onRemove} aria-label="Remove step">
          <Trash2 className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>
    </div>
  );
}

export function RequisitionApprovalsCard({ profiles }: { profiles: User[] }) {
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

  function moveStep(segment: Segment, index: number, delta: -1 | 1) {
    updateSteps(segment, (steps) => {
      const next = [...steps];
      const [moved] = next.splice(index, 1);
      next.splice(index + delta, 0, moved);
      return next;
    });
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
    const cleaned: RequisitionWorkflows = {
      IPS: { steps: workflows.IPS.steps.map((s) => ({ ...s, approverEmail: s.approverEmail.trim().toLowerCase(), appliesTo: undefined })) },
      SO: { steps: workflows.SO.steps.map((s) => ({ ...s, approverEmail: s.approverEmail.trim().toLowerCase() })) },
    };
    const problem = validate(cleaned);
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
      setMessage({ tone: "ok", text: "Approvers saved. New requests will use them; requests already in progress keep their original approvers." });
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
          in order. Each approver gets an email link and must sign in with the Google account below to approve or
          reject. Once the last one approves, the request becomes an Open Role.
        </p>
        {!configured && workflows && (
          <p className="rounded-md bg-amber-50 p-2 text-xs text-amber-800">
            Not set up yet. The steps below are suggestions; add each approver&apos;s Google account and save. Until
            then, new requests wait for a Recruitment Manager to approve them in the app.
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
          SEGMENTS.map(({ segment, title, blurb }) => (
            <div key={segment} className="space-y-1">
              <div className="flex items-baseline justify-between">
                <p className="text-sm font-medium">{title}</p>
                <p className="text-xs text-muted-foreground">{blurb}</p>
              </div>
              {workflows[segment].steps.length === 0 ? (
                <p className="py-2 text-xs text-muted-foreground">No approvers — add at least one step.</p>
              ) : (
                workflows[segment].steps.map((step, i) => (
                  <StepRow
                    key={step.id}
                    step={step}
                    index={i}
                    count={workflows[segment].steps.length}
                    segment={segment}
                    onChange={(patch) => changeStep(segment, step.id, patch)}
                    onMove={(delta) => moveStep(segment, i, delta)}
                    onRemove={() => updateSteps(segment, (steps) => steps.filter((s) => s.id !== step.id))}
                  />
                ))
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  updateSteps(segment, (steps) => [...steps, { id: newStepId(), label: "", approverName: "", approverEmail: "" }])
                }
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Add step
              </Button>
            </div>
          ))
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
