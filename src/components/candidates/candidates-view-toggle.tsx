"use client";

import { KanbanSquare, List } from "lucide-react";
import { cn } from "@/lib/utils";

export type CandidatesViewMode = "list" | "kanban";

export function CandidatesViewToggle({
  view,
  onChange,
}: {
  view: CandidatesViewMode;
  onChange: (view: CandidatesViewMode) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-border p-0.5">
      <button
        type="button"
        onClick={() => onChange("list")}
        className={cn(
          "flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-sm font-medium transition-colors",
          view === "list" ? "bg-penda-teal text-white" : "text-muted-foreground hover:text-foreground"
        )}
      >
        <List className="h-4 w-4" />
        List
      </button>
      <button
        type="button"
        onClick={() => onChange("kanban")}
        className={cn(
          "flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-sm font-medium transition-colors",
          view === "kanban" ? "bg-penda-teal text-white" : "text-muted-foreground hover:text-foreground"
        )}
      >
        <KanbanSquare className="h-4 w-4" />
        Kanban
      </button>
    </div>
  );
}
