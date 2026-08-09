"use client";

import * as React from "react";
import { useChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
  type InferUITools,
  type UIDataTypes,
  type UIMessage,
} from "ai";
import { AlertTriangle, Copy, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { aiTools } from "@/lib/ai/tools";
import { AI_PROVIDERS, type ProviderId } from "@/lib/ai/providers";
import { buildAiContext } from "@/lib/ai/build-context";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";
import { cn } from "@/lib/utils";
import type { Candidate, Interview, OpenRole } from "@/types";

type ChatMessage = UIMessage<unknown, UIDataTypes, InferUITools<typeof aiTools>>;
type Preset = { label: string; prompt?: string; getPrompt?: () => string };

// ── Weekly Summary data pre-computation ───────────────────────────────────────
// Numbers are computed in JS from live state — never inferred by the LLM —
// so the summary is always numerically accurate regardless of context window size.

function dayOfWeek(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", { weekday: "long" });
}

function buildWeeklySummaryPrompt(
  openRoles: OpenRole[],
  candidates: Candidate[],
  interviews: Interview[]
): string {
  const date = new Date().toLocaleDateString("en-GB", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const ACTIVE_STAGES = new Set(["First Interview","Second Interview","Panel Interview","Work Trial","Reference Check","Offer"]);
  const now = new Date();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000);
  const weekEnd   = new Date(now.getTime() + 7  * 86400000);

  const roleById = new Map(openRoles.map(r => [r.id, r]));

  // Candidates helpers
  const activeCands   = (roleId: string) => candidates.filter(c => c.roleId === roleId && ACTIVE_STAGES.has(c.stage));
  const pipelineLabel = (roleId: string): string => {
    const active = activeCands(roleId);
    if (active.length === 0) return "";
    const counts: Record<string, number> = {};
    for (const c of active) counts[c.stage] = (counts[c.stage] ?? 0) + 1;
    const parts = Object.entries(counts).map(([s, n]) => `${n} at ${s}`);
    return ` | ${active.length} in pipeline (${parts.join(", ")})`;
  };

  // Recently hired (last 14 days)
  const recentlyHired = candidates.filter(c => {
    if (c.stage !== "Hired") return false;
    const d = new Date(c.stageEnteredAt);
    return !isNaN(d.getTime()) && d >= twoWeeksAgo;
  }).map(c => {
    const role = roleById.get(c.roleId ?? "");
    return { name: c.name, title: role?.title ?? "Unknown", dept: c.department ?? role?.department ?? "", segment: c.segment ?? role?.segment ?? "" };
  });

  // This-week interviews
  const thisWeekInterviews = interviews.filter(i => {
    const d = new Date(i.date);
    return d >= now && d <= weekEnd;
  });
  const interviewsByRoleDay = new Map<string, number>();
  for (const i of thisWeekInterviews) {
    const role = roleById.get(i.roleId);
    const key  = `${role?.title ?? "Unknown"}|||${dayOfWeek(i.date)}`;
    interviewsByRoleDay.set(key, (interviewsByRoleDay.get(key) ?? 0) + 1);
  }

  // Pipeline stage counts
  const stageCounts: Record<string, number> = {};
  for (const c of candidates) {
    if (ACTIVE_STAGES.has(c.stage)) stageCounts[c.stage] = (stageCounts[c.stage] ?? 0) + 1;
  }

  // Offers out / work trials
  const offersOut  = candidates.filter(c => c.stage === "Offer").length;
  const hiredTotal = candidates.filter(c => c.stage === "Hired").length;
  const pendingWorkTrials = candidates.filter(c => c.stage === "Work Trial").length;

  // Build per-segment, per-department role blocks
  const segments = ["IPS", "SO"] as const;
  const segmentBlocks: string[] = [];

  for (const seg of segments) {
    const segRoles = openRoles.filter(r => r.segment === seg && r.status !== "Cancelled");
    const openOnly = segRoles.filter(r => r.status === "Open" || r.status === "Allocated" || r.status === "On Hold");

    const totalHcGap = openOnly.reduce((s, r) => s + Math.max(r.hcApproved - r.hcFilled, 0), 0);
    const totalPipeline = openOnly.reduce((s, r) => s + activeCands(r.id).length, 0);
    const segOffers  = openOnly.reduce((s, r) => s + candidates.filter(c => c.roleId === r.id && c.stage === "Offer").length, 0);
    const segHired   = recentlyHired.filter(h => h.segment === seg);

    const depts = Array.from(new Set(openOnly.map(r => r.department))).sort();
    const deptBlocks: string[] = [];

    for (const dept of depts) {
      const deptRoles = openOnly.filter(r => r.department === dept);
      const deptHcGap = deptRoles.reduce((s, r) => s + Math.max(r.hcApproved - r.hcFilled, 0), 0);
      const deptHired = segHired.filter(h => h.dept === dept).map(h => h.title);

      const lines: string[] = [];
      for (const r of deptRoles) {
        const gap = Math.max(r.hcApproved - r.hcFilled, 0);
        const pipeline = pipelineLabel(r.id);
        const status = r.status !== "Open" ? ` (${r.status})` : "";
        lines.push(`  ROLE: ${r.title} – ${r.location} | HC: ${r.hcFilled}/${r.hcApproved} | gap: ${gap}${status}${pipeline}${r.notes ? ` | notes: ${r.notes}` : ""}`);
      }
      if (deptHired.length > 0) {
        lines.push(`  RECENTLY_HIRED: ${deptHired.join(", ")} (last 14 days)`);
      }

      deptBlocks.push(`DEPT: ${dept} | total HC gap: ${deptHcGap}\n${lines.join("\n")}`);
    }

    segmentBlocks.push(
      `=== ${seg} SEGMENT ===\n` +
      `HC Gap: ${totalHcGap} | Active Pipeline: ${totalPipeline} | Offers Out: ${segOffers}\n\n` +
      deptBlocks.join("\n\n")
    );
  }

  // This week's interview schedule
  const interviewLines = Array.from(interviewsByRoleDay.entries())
    .map(([key, count]) => {
      const [title, day] = key.split("|||");
      return `  ${title}${count > 1 ? ` (${count} panels)` : ""} – ${day}`;
    })
    .sort();
  const interviewBlock = interviewLines.length > 0
    ? interviewLines.join("\n")
    : "  [No interviews logged in the system for this week]";

  // Pipeline stages summary
  const stageOrder = ["First Interview","Second Interview","Panel Interview","Work Trial","Reference Check","Offer"];
  const stageLines = stageOrder.filter(s => (stageCounts[s] ?? 0) > 0).map(s => `${s}: ${stageCounts[s]}`).join(" · ");

  // Recently hired block
  const hiredBlock = recentlyHired.length > 0
    ? recentlyHired.map(h => `  ${h.name} – ${h.title} (${h.dept})`).join("\n")
    : "  [No hires in last 14 days]";

  const verifiedData = `
=== VERIFIED DATA (pre-computed in JS — use these numbers exactly) ===

${segmentBlocks.join("\n\n")}

=== PIPELINE STAGES (all candidates) ===
${stageLines || "No active pipeline"}

=== OFFERS & HIRING ===
Offers out: ${offersOut} | Total hired (all time): ${hiredTotal} | Work Trials pending: ${pendingWorkTrials}

=== RECENTLY HIRED (last 14 days) ===
${hiredBlock}

=== THIS WEEK INTERVIEWS (next 7 days, from system) ===
${interviewBlock}

=== END VERIFIED DATA ===`.trim();

  return `You are generating a weekly recruitment status WhatsApp update for Penda Health.

${verifiedData}

INSTRUCTIONS:
1. Format as a WhatsApp message using the EXACT structure below.
2. Use ONLY the verified numbers above — never compute from context JSON.
3. WhatsApp bold = *text* (single asterisk). No double asterisks, no markdown headers.
4. Status icon per role: 🔴 gap ≥ 2 AND 0 pipeline  🟡 has pipeline  🟢 gap ≤ 1 or allocated  ⚪ gap = 0, no pipeline
5. Include 📌 notes inline under each role where notes are present.
6. After each department's role list, add a "Status:" line ONLY if RECENTLY_HIRED data or a clear pattern (stalled candidates, notes context) supports a genuine insight. Do NOT invent context (e.g. maternity leave) unless it's in the notes field.
7. For the Offers & Hiring section, "Accepted" means the total hired count from the data above.
8. For THIS WEEK INTERVIEWS: if the system has interview data, format as the example. If not, flag it and add a question asking what interviews are planned.
9. Close with a ❓ *QUESTIONS* section: ask specific, answerable questions ONLY for departments where the gap is significant (≥ 2) or new and no notes explain it, AND about missing interview details if not logged. Max 5 questions. Omit section entirely if no genuine gaps in knowledge.

EXACT FORMAT:

📊 *PENDA HEALTH | WEEKLY RECRUITMENT UPDATE*
📅 ${date}

━━━━━━━━━━━━━━━━
🏥 *IPS SEGMENT*
━━━━━━━━━━━━━━━━
HC Gap: [number] | Active Candidates: [number] | Active Offers: [number]

*[Department]* HC: [total dept HC gap]
• [Role] – [Location]: [gap] HC gap[pipeline if any] [icon]
  📌 [notes if present]
[Status: insight if data supports it]

[repeat per department]

━━━━━━━━━━━━━━━━
🏢 *SO SEGMENT*
━━━━━━━━━━━━━━━━
HC Gap: [number] | Active Pipeline: [number]

[same per-dept format]

━━━━━━━━━━━━━━━━
📋 *PIPELINE STAGES*
━━━━━━━━━━━━━━━━
[Stage: count · Stage: count ...]

━━━━━━━━━━━━━━━━
📝 *OFFERS & HIRING*
━━━━━━━━━━━━━━━━
Offers out: [n] | Accepted: [hired total] | Work Trials pending: [n]

━━━━━━━━━━━━━━━━
📅 *THIS WEEK INTERVIEWS*
━━━━━━━━━━━━━━━━
[Role (N panels) – Day]
[or flag if not in system]

[❓ *QUESTIONS* section only if needed]

Generate the full report now.`;
}

// ─────────────────────────────────────────────────────────────────────────────

function CopyButton({ getText }: { getText: () => string }) {
  const [copied, setCopied] = React.useState(false);
  function handleCopy() {
    const text = getText();
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button type="button" onClick={handleCopy}
      className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
      <Copy className="h-3 w-3" />
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export function AiAssistantLauncher() {
  const {
    openRoles, candidates, offers, branches, interviews,
    workTrials, referenceChecks, canEdit, canSeeSalary, updateOpenRoleStatus,
  } = useRecruitmentData();
  const [providerId, setProviderId] = React.useState<ProviderId>("llama");
  const [input, setInput] = React.useState("");
  const bottomRef = React.useRef<HTMLDivElement>(null);

  // Presets live inside the component so Weekly Summary can access live data
  const PRESETS = React.useMemo((): Preset[] => [
    { label: "Summary", prompt: "Give me a quick summary of today's recruiting status." },
    { label: "Stalled roles", prompt: "Which open roles have no candidates in pipeline and are high priority?" },
    { label: "By department", prompt: "Break down open roles by department for both IPS and SO." },
    { label: "By branch", prompt: "Which branches have the most open headcount gaps? List each branch and its gap." },
    {
      label: "Weekly Summary",
      getPrompt: () => buildWeeklySummaryPrompt(openRoles, candidates, interviews),
    },
  ], [openRoles, candidates, interviews]);

  const transport = React.useMemo(() => new DefaultChatTransport<ChatMessage>({ api: "/api/ai/chat" }), []);

  const { messages, sendMessage, status, addToolResult, error } = useChat<ChatMessage>({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, error]);

  function send(prompt: string) {
    const text = prompt.trim();
    if (!text || status === "streaming" || status === "submitted") return;
    const context = buildAiContext({
      openRoles, candidates, offers, branches, interviews, workTrials, referenceChecks, canSeeSalary,
    });
    sendMessage({ text }, { body: { providerId, context, canEdit } });
    setInput("");
  }

  async function resolveToolCall(
    toolCallId: string,
    input: { roleId: string; roleTitle: string; status: string },
    approve: boolean
  ) {
    if (!approve) {
      addToolResult({ tool: "setRoleStatus", toolCallId, state: "output-available", output: { ok: false, message: "Cancelled by user." } });
      return;
    }
    if (!canEdit) {
      addToolResult({
        tool: "setRoleStatus",
        toolCallId,
        state: "output-available",
        output: { ok: false, message: "You don't have permission to edit recruitment data." },
      });
      return;
    }
    updateOpenRoleStatus(input.roleId, input.status as never);
    addToolResult({
      tool: "setRoleStatus",
      toolCallId,
      state: "output-available",
      output: { ok: true, message: `Marked ${input.roleTitle} as ${input.status}.` },
    });
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <button
          type="button"
          aria-label="Open Penny, your AI assistant"
          className="fixed right-5 bottom-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-penda-blue text-white shadow-lg hover:bg-penda-blue-dark transition-colors"
        >
          <Sparkles className="h-5 w-5" />
        </button>
      </SheetTrigger>
      <SheetContent className="flex flex-col gap-3">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-penda-blue" /> Penny
          </SheetTitle>
        </SheetHeader>

        {/* Provider selector */}
        <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
          {AI_PROVIDERS.map((p) => (
            <button
              key={p.id}
              type="button"
              title={p.description}
              onClick={() => setProviderId(p.id)}
              className={cn(
                "flex-1 truncate rounded-sm px-2 py-1 text-xs font-medium transition-colors",
                providerId === p.id ? "bg-penda-blue text-white" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Preset buttons */}
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((preset) => (
            <Button
              key={preset.label}
              size="sm"
              variant="outline"
              onClick={() => send(preset.getPrompt?.() ?? preset.prompt ?? "")}
            >
              {preset.label}
            </Button>
          ))}
        </div>

        {/* Message area */}
        <ScrollArea className="flex-1 -mx-1 px-1">
          <div className="space-y-3 pb-2">
            {messages.length === 0 && !error && (
              <p className="text-sm text-muted-foreground">
                Ask about candidates, open roles, interviews, work trials, or offers. I have full visibility of the pipeline.
              </p>
            )}

            {messages.map((message) => (
              <div key={message.id} className={cn("text-sm", message.role === "user" ? "text-right" : "text-left")}>
                <div
                  className={cn(
                    "inline-block max-w-[85%] rounded-lg px-3 py-2 text-left",
                    message.role === "user" ? "bg-penda-blue text-white" : "bg-muted text-foreground"
                  )}
                >
                  {message.parts.map((part, i) => {
                    if (part.type === "text") {
                      return <p key={i} className="whitespace-pre-wrap">{part.text}</p>;
                    }
                    if (part.type === "tool-setRoleStatus") {
                      if (part.state === "input-available") {
                        const { roleId, roleTitle, status: newStatus } = part.input;
                        return (
                          <div key={i} className="space-y-2 rounded-md border border-border bg-background p-2.5 text-foreground">
                            <p className="text-xs">
                              Mark <span className="font-semibold">{roleTitle}</span> as{" "}
                              <span className="font-semibold">{newStatus}</span>?
                            </p>
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => resolveToolCall(part.toolCallId, { roleId, roleTitle, status: newStatus }, true)}>
                                Confirm
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => resolveToolCall(part.toolCallId, { roleId, roleTitle, status: newStatus }, false)}>
                                Cancel
                              </Button>
                            </div>
                          </div>
                        );
                      }
                      if (part.state === "output-available") {
                        return (
                          <p key={i} className="text-xs italic text-muted-foreground">
                            {(part.output as { message: string }).message}
                          </p>
                        );
                      }
                    }
                    return null;
                  })}
                </div>
                {message.role === "assistant" && (
                  <CopyButton
                    getText={() =>
                      message.parts
                        .filter((p): p is { type: "text"; text: string } => p.type === "text")
                        .map((p) => p.text)
                        .join("\n")
                    }
                  />
                )}
              </div>
            ))}

            {(status === "submitted" || status === "streaming") && (
              <p className="text-xs text-muted-foreground animate-pulse">Penny is thinking…</p>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{(() => {
                  let msg = error.message;
                  try { const parsed = JSON.parse(msg); msg = parsed.error ?? parsed.message ?? msg; } catch { /* plain text */ }
                  if (msg.includes("503") || msg.includes("not configured"))
                    return `${AI_PROVIDERS.find((p) => p.id === providerId)?.label ?? "This model"} isn't configured on this deployment. Try switching to Llama 3.3 (Groq).`;
                  return msg;
                })()}</span>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-end gap-2"
        >
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder="Ask Penny anything…"
            className="min-h-10 flex-1"
          />
          <Button type="submit" size="icon" disabled={!input.trim() || status === "streaming" || status === "submitted"}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
