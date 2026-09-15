"use client";

// In-progress-answer persistence for the public reference-check-request
// form (src/app/reference-check-request/page.tsx) — a candidate typing out
// 2-4 referees' names/emails/phones on their phone, one field at a time.
//
// Built on the shared localStorage engine (form-draft.ts) — see that file
// for why this is localStorage rather than a server-side draft. Scoped per
// token.

import { makeDraftStore, type DraftBase } from "./form-draft";

const DRAFT_VERSION = 1;

export type RefereeInputDraft = { name: string; email: string; phone: string };

export interface ReferenceCheckRequestDraft extends DraftBase {
  referees: RefereeInputDraft[];
}

const store = makeDraftStore<ReferenceCheckRequestDraft>("reference-check-request", DRAFT_VERSION);

export function loadDraft(token: string): ReferenceCheckRequestDraft | null {
  return store.load(token);
}

export function saveDraft(token: string, draft: Omit<ReferenceCheckRequestDraft, "version" | "savedAt">): void {
  store.save(token, draft);
}

export function clearDraft(token: string): void {
  store.clear(token);
}
