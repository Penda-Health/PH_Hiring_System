"use client";

// Shared engine behind every public form's local "resume where you left
// off" autosave draft. Extracted from what was originally
// bm-feedback-draft.ts's hand-rolled localStorage logic — every public form
// that collects more than a click's worth of data builds a small typed
// wrapper around this (see referee-draft.ts, work-trial-draft.ts, etc.)
// instead of reimplementing load/save/clear per form.
//
// Deliberately localStorage, not a server-side draft: it's zero extra
// surface on the token-authenticated /api/public/* routes (which only know
// about *submitted* state), and every failure mode (private browsing,
// quota, corrupt JSON) just means "no draft to restore" rather than a
// broken form. The tradeoff is a draft doesn't follow someone across
// devices — acceptable for links that are opened and filled on whatever one
// phone/laptop the person is holding at the time, not switched mid-fill.

export interface DraftBase {
  version: number;
  savedAt: string;
}

/**
 * `formName` scopes the localStorage key namespace (e.g. "bm-feedback",
 * "referee"); `version` is bumped whenever a form's draft shape changes so
 * an old, differently-shaped draft is silently discarded (a version
 * mismatch is treated the same as "no draft") instead of crashing restore.
 *
 * `key` (passed to load/save/clear) is whatever disambiguates one person's
 * in-progress answers from another's on a shared browser — usually the
 * form's own token query param, sometimes a fixed constant for forms with
 * no per-recipient link at all (see requisition-request-draft.ts).
 */
export function makeDraftStore<T extends DraftBase>(formName: string, version: number) {
  function draftKey(key: string): string {
    return `${formName}-draft:${key}`;
  }

  function load(key: string): T | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(draftKey(key));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as T;
      if (parsed.version !== version) return null;
      return parsed;
    } catch {
      // Corrupt JSON, private-browsing storage disabled, etc. — no draft.
      return null;
    }
  }

  function save(key: string, draft: Omit<T, "version" | "savedAt">): void {
    if (typeof window === "undefined") return;
    try {
      const full = { ...draft, version, savedAt: new Date().toISOString() } as T;
      window.localStorage.setItem(draftKey(key), JSON.stringify(full));
    } catch {
      // Quota exceeded or storage unavailable — losing autosave silently is
      // far better than throwing out of a keystroke handler.
    }
  }

  function clear(key: string): void {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(draftKey(key));
    } catch {
      // Nothing to do if storage is unavailable.
    }
  }

  return { load, save, clear };
}
