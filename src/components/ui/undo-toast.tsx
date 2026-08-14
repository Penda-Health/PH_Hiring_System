"use client";

// A floating "Undo" toast for optimistic deletes. Callers already hide the
// item from local state immediately (existing pattern); scheduleDelete() just
// holds the real network delete for `ms` and shows a dismissible toast that,
// if clicked, cancels the pending delete and restores local state instead.
// Deliberately not a generic toast lib (no success/error variants) — this app
// has no other toast use case yet, so it's scoped to the one job it has.
import * as React from "react";
import { cn } from "@/lib/utils";

export const DEFAULT_UNDO_WINDOW_MS = 30_000;

type PendingDelete = {
  id: number;
  label: string;
  ms: number;
  timeoutId: ReturnType<typeof setTimeout>;
  undo: () => void;
};

type ScheduleDeleteOptions = {
  /** Shown as "{label} deleted." in the toast. */
  label: string;
  /** Performs the real delete (e.g. the Airtable call). Fires after `ms` unless undone. */
  onCommit: () => void;
  /** Restores whatever local state the caller already hid, e.g. re-inserting the item. */
  onUndo: () => void;
  /** @default 30000 */
  ms?: number;
};

type UndoToastContextValue = {
  scheduleDelete: (options: ScheduleDeleteOptions) => void;
};

const UndoToastContext = React.createContext<UndoToastContextValue | null>(null);

export function useUndoToast(): UndoToastContextValue {
  const ctx = React.useContext(UndoToastContext);
  if (!ctx) throw new Error("useUndoToast must be used within an UndoToastProvider");
  return ctx;
}

export function UndoToastProvider({ children }: { children: React.ReactNode }) {
  const [pending, setPending] = React.useState<PendingDelete[]>([]);
  const nextIdRef = React.useRef(0);

  const scheduleDelete = React.useCallback(
    ({ label, onCommit, onUndo, ms = DEFAULT_UNDO_WINDOW_MS }: ScheduleDeleteOptions) => {
      const id = nextIdRef.current++;
      const timeoutId = setTimeout(() => {
        onCommit();
        setPending((prev) => prev.filter((p) => p.id !== id));
      }, ms);
      setPending((prev) => [...prev, { id, label, ms, timeoutId, undo: onUndo }]);
    },
    []
  );

  const handleUndo = React.useCallback((item: PendingDelete) => {
    clearTimeout(item.timeoutId);
    item.undo();
    setPending((prev) => prev.filter((p) => p.id !== item.id));
  }, []);

  return (
    <UndoToastContext.Provider value={{ scheduleDelete }}>
      {children}
      {pending.length > 0 && (
        <div className="fixed bottom-4 left-1/2 z-[60] flex -translate-x-1/2 flex-col-reverse gap-2">
          {pending.map((item) => (
            <UndoToastRow key={item.id} item={item} onUndo={() => handleUndo(item)} />
          ))}
        </div>
      )}
    </UndoToastContext.Provider>
  );
}

function UndoToastRow({ item, onUndo }: { item: PendingDelete; onUndo: () => void }) {
  // Progress bar shrinks from full width to 0 over `ms` via a CSS transition
  // kicked off a frame after mount, rather than a JS interval — cheaper and
  // stays in sync with the real setTimeout without a second timer to drift.
  const [shrink, setShrink] = React.useState(false);
  React.useEffect(() => {
    const raf = requestAnimationFrame(() => setShrink(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      role="status"
      className="relative flex min-w-[280px] max-w-sm items-center gap-3 overflow-hidden rounded-md border border-border bg-popover px-4 py-2.5 text-popover-foreground shadow-lg animate-in fade-in slide-in-from-bottom-2"
    >
      <div className="flex-1 text-sm">{item.label} deleted.</div>
      <button
        type="button"
        onClick={onUndo}
        className="shrink-0 text-sm font-medium text-penda-blue hover:underline focus:outline-none focus:underline"
      >
        Undo
      </button>
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 h-0.5 origin-left bg-penda-blue/70 transition-transform ease-linear",
          shrink ? "scale-x-0" : "scale-x-100"
        )}
        style={{ transitionDuration: `${item.ms}ms` }}
      />
    </div>
  );
}
