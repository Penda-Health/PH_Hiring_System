"use client";

// In-progress-answer persistence for the public work-trial confirmation
// form (src/app/work-trial/page.tsx) — a single step (branch, date, an
// optional note), but still worth protecting: a candidate picking a branch
// and typing a note on their phone shouldn't have to redo it after an
// accidental back-swipe or a dropped connection.
//
// Built on the shared localStorage engine (form-draft.ts) — see that file
// for why this is localStorage rather than a server-side draft. Scoped per
// token.

import { makeDraftStore, type DraftBase } from "./form-draft";

const DRAFT_VERSION = 1;

export interface WorkTrialDraft extends DraftBase {
  branchId: string;
  date: string;
  notes: string;
}

const store = makeDraftStore<WorkTrialDraft>("work-trial", DRAFT_VERSION);

export function loadDraft(token: string): WorkTrialDraft | null {
  return store.load(token);
}

export function saveDraft(token: string, draft: Omit<WorkTrialDraft, "version" | "savedAt">): void {
  store.save(token, draft);
}

export function clearDraft(token: string): void {
  store.clear(token);
}
