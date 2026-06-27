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
import { Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { aiTools } from "@/lib/ai/tools";
import { AI_PROVIDERS, type ProviderId } from "@/lib/ai/providers";
import { buildAiContext } from "@/lib/ai/build-context";
import { useRecruitmentData } from "@/lib/data-store/recruitment-context";
import { cn } from "@/lib/utils";

type ChatMessage = UIMessage<unknown, UIDataTypes, InferUITools<typeof aiTools>>;

const PRESETS = [
  { label: "Generate Summary", prompt: "Give me a quick summary of today's recruiting status." },
  { label: "What's stalled?", prompt: "Which open roles look stalled or at risk, and why?" },
  { label: "By department", prompt: "Break down open roles by department for both IPS and SO." },
];

export function AiAssistantLauncher() {
  const { openRoles, candidates, offers, canEdit, updateOpenRoleStatus } = useRecruitmentData();
  const [providerId, setProviderId] = React.useState<ProviderId>("llama");
  const [input, setInput] = React.useState("");
  const bottomRef = React.useRef<HTMLDivElement>(null);

  const transport = React.useMemo(() => new DefaultChatTransport<ChatMessage>({ api: "/api/ai/chat" }), []);

  const { messages, sendMessage, status, addToolResult } = useChat<ChatMessage>({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function send(prompt: string) {
    const text = prompt.trim();
    if (!text || status === "streaming" || status === "submitted") return;
    const context = buildAiContext({ openRoles, candidates, offers });
    sendMessage({ text }, { body: { providerId, context, canEdit } });
    setInput("");
  }

  async function resolveToolCall(toolCallId: string, input: { roleId: string; roleTitle: string; status: string }, approve: boolean) {
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
          className="fixed right-5 bottom-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-penda-teal text-white shadow-lg hover:bg-penda-teal-dark transition-colors"
        >
          <Sparkles className="h-5 w-5" />
        </button>
      </SheetTrigger>
      <SheetContent className="flex flex-col gap-3">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-penda-teal" /> Penny
          </SheetTitle>
        </SheetHeader>

        <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
          {AI_PROVIDERS.map((p) => (
            <button
              key={p.id}
              type="button"
              title={p.description}
              onClick={() => setProviderId(p.id)}
              className={cn(
                "flex-1 truncate rounded-sm px-2 py-1 text-xs font-medium transition-colors",
                providerId === p.id ? "bg-penda-teal text-white" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((preset) => (
            <Button key={preset.label} size="sm" variant="outline" onClick={() => send(preset.prompt)}>
              {preset.label}
            </Button>
          ))}
        </div>

        <ScrollArea className="flex-1 -mx-1 px-1">
          <div className="space-y-3 pb-2">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Ask about open roles, pipeline status, or request a status change — I&apos;ll always confirm before
                changing anything.
              </p>
            )}
            {messages.map((message) => (
              <div key={message.id} className={cn("text-sm", message.role === "user" ? "text-right" : "text-left")}>
                <div
                  className={cn(
                    "inline-block max-w-[85%] rounded-lg px-3 py-2 text-left",
                    message.role === "user" ? "bg-penda-teal text-white" : "bg-muted text-foreground"
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
                              Mark <span className="font-semibold">{roleTitle}</span> ({roleId}) as{" "}
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
              </div>
            ))}
            {(status === "submitted" || status === "streaming") && (
              <p className="text-xs text-muted-foreground">Penny is thinking…</p>
            )}
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

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
