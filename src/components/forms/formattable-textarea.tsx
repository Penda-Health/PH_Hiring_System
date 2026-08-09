"use client";

import * as React from "react";
import { Bold, Italic, List } from "lucide-react";
import { cn } from "@/lib/utils";

// A plain <textarea> with a small toolbar that inserts Markdown syntax
// (**bold**, *italic*, "- " bullets) at the cursor/selection. We keep the
// underlying value as plain Markdown text rather than HTML — these fields
// are stored as plain-text Airtable fields and read as-is by Penny (the AI
// assistant), so Markdown stays readable everywhere without needing a rich
// text editor dependency or an HTML sanitization/rendering story.
export function FormattableTextarea({
  id,
  value,
  onChange,
  placeholder,
  rows = 3,
  minLength,
  required,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  minLength?: number;
  required?: boolean;
}) {
  const ref = React.useRef<HTMLTextAreaElement>(null);
  const pendingSelection = React.useRef<{ start: number; end: number } | null>(null);

  React.useEffect(() => {
    if (pendingSelection.current && ref.current) {
      const { start, end } = pendingSelection.current;
      ref.current.focus();
      ref.current.setSelectionRange(start, end);
      pendingSelection.current = null;
    }
  }, [value]);

  function applyWrap(prefix: string, suffix: string, placeholderText: string) {
    const el = ref.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const selected = value.slice(start, end) || placeholderText;
    onChange(value.slice(0, start) + prefix + selected + suffix + value.slice(end));
    const selStart = start + prefix.length;
    pendingSelection.current = { start: selStart, end: selStart + selected.length };
  }

  function applyBulletList() {
    const el = ref.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const lineEndIdx = value.indexOf("\n", end);
    const lineEnd = lineEndIdx === -1 ? value.length : lineEndIdx;
    const block = value.slice(lineStart, lineEnd);
    const bulleted = block
      .split("\n")
      .map((line) => (line.startsWith("- ") || !line ? line : `- ${line}`))
      .join("\n");
    onChange(value.slice(0, lineStart) + bulleted + value.slice(lineEnd));
    pendingSelection.current = { start: lineStart, end: lineStart + bulleted.length };
  }

  const count = value.trim().length;
  const meetsMin = minLength === undefined || count >= minLength;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-0.5 rounded-t-md border border-b-0 border-border bg-muted/40 px-1 py-1">
        <ToolbarButton title="Bold" onClick={() => applyWrap("**", "**", "bold text")}>
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Italic" onClick={() => applyWrap("*", "*", "italic text")}>
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton title="Bullet list" onClick={applyBulletList}>
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
      </div>
      <textarea
        ref={ref}
        id={id}
        required={required}
        minLength={minLength}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-b-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-penda-blue/40 resize-none"
      />
      {minLength !== undefined && (
        <p className={cn("text-xs", meetsMin ? "text-muted-foreground" : "text-destructive")}>
          {count}/{minLength} characters minimum
        </p>
      )}
    </div>
  );
}

function ToolbarButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="rounded p-1 text-muted-foreground hover:bg-background hover:text-foreground transition-colors"
    >
      {children}
    </button>
  );
}
