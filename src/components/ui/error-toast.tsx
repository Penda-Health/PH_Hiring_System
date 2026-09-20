"use client";

// A floating error toast for background writes that fail silently otherwise.
// Most dashboard edits go through recruitment-context.tsx's optimistic
// "update local state now, persist in the background" pattern (see persist()
// and the scheduleDelete()/auto-create catch sites there) — deliberately so,
// per that file's own comment, since rolling back an in-progress edit the
// user has moved on from would be its own kind of confusing. But until this
// file existed, a failed background write only ever reached console.error:
// nothing told the user their change didn't actually save. reportError()
// closes that gap without threading a hook through every mutator (persist()
// and guardEdit() are deliberately plain functions, not hooks, callable from
// anywhere) — a module-level listener bridges into whichever component tree
// has ErrorToastProvider mounted, the same "callable from anywhere" shape
// libraries like react-hot-toast/sonner use for the same reason.
//
// Separate from UndoToastProvider (undo-toast.tsx) on purpose — that one is
// explicitly scoped to the one job it has (delete + undo), and overloading
// it with an unrelated error variant would blur that boundary rather than
// respect it.
import * as React from "react";
import { AlertTriangle, X } from "lucide-react";

const DEFAULT_ERROR_TOAST_MS = 8_000;

type Listener = (message: string) => void;
let listener: Listener | null = null;

/** Call from anywhere — including plain (non-hook) functions like persist()
 *  in recruitment-context.tsx — to surface a background-write failure to the
 *  user. No-op before ErrorToastProvider has mounted or after it unmounts
 *  (e.g. a stray late rejection during route teardown). */
export function reportError(message: string) {
  listener?.(message);
}

type ErrorToastItem = { id: number; message: string };

export function ErrorToastProvider({ children }: { children: React.ReactNode }) {
  const [errors, setErrors] = React.useState<ErrorToastItem[]>([]);
  const nextIdRef = React.useRef(0);

  const dismiss = React.useCallback((id: number) => {
    setErrors((prev) => prev.filter((e) => e.id !== id));
  }, []);

  React.useEffect(() => {
    listener = (message) => {
      const id = nextIdRef.current++;
      setErrors((prev) => [...prev, { id, message }]);
      setTimeout(() => dismiss(id), DEFAULT_ERROR_TOAST_MS);
    };
    return () => {
      listener = null;
    };
  }, [dismiss]);

  return (
    <>
      {children}
      {errors.length > 0 && (
        <div className="fixed top-4 right-4 z-[70] flex w-full max-w-sm flex-col gap-2">
          {errors.map((item) => (
            <div
              key={item.id}
              role="alert"
              className="flex items-start gap-2.5 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive shadow-lg animate-in fade-in slide-in-from-top-2"
            >
              <AlertTriangle className="h-4 w-4 shrink-0 translate-y-0.5" />
              <div className="flex-1">{item.message}</div>
              <button
                type="button"
                onClick={() => dismiss(item.id)}
                className="shrink-0 rounded p-0.5 hover:bg-destructive/10 focus:outline-none"
                aria-label="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
