"use client";

// In-progress-answer persistence for the public work-trial-request form
// (src/app/work-trial-request/page.tsx) — the one public form with no
// per-recipient token in the URL: a brand-new candidate lands on a single
// shared link and only gets a session token *after* identifying themselves.
//
// Because there's nothing to key a draft on before that point, this uses a
// single fixed slot per browser rather than a per-token key (like every
// other *-draft.ts module) — acceptable for the same reason localStorage
// itself is acceptable: this link is filled out on one person's own device,
// not handed around a shared one. Re-identifying (name/phone/email) is
// cheap and idempotent, so the draft always restores onto the "identify"
// step pre-filled, rather than trying to trust a session token across a
// refresh — the role/branch/date choices just ride along in the same
// restored state and reappear once identify succeeds again.
//
// Deliberately excludes reschedule mode: rescheduling only ever touches an
// already-confirmed booking (branch/date), which the candidate can always
// look up again via identify — not the "lost unsaved work" case this
// exists to prevent.
//
// Built on the shared localStorage engine (form-draft.ts).

import { makeDraftStore, type DraftBase } from "./form-draft";

const DRAFT_VERSION = 1;
const DRAFT_KEY = "default";

export interface WorkTrialRequestDraft extends DraftBase {
  name: string;
  phoneLocal: string;
  email: string;
  selectedCadre: string;
  subRole: string;
  branchId: string;
  date: string;
}

const store = makeDraftStore<WorkTrialRequestDraft>("work-trial-request", DRAFT_VERSION);

export function loadDraft(): WorkTrialRequestDraft | null {
  return store.load(DRAFT_KEY);
}

export function saveDraft(draft: Omit<WorkTrialRequestDraft, "version" | "savedAt">): void {
  store.save(DRAFT_KEY, draft);
}

export function clearDraft(): void {
  store.clear(DRAFT_KEY);
}
