"use client";

// In-progress-answer persistence for the public BM feedback form
// (src/app/bm-feedback/page.tsx). A Branch Manager or Incharge filling this
// out mid-shift is very likely to get pulled away — closing the tab, losing
// signal, or the phone locking — before finishing the scoring/feedback steps.
// Those steps enforce a written-assessment minimum length, so losing that
// work is the expensive case this exists to prevent.
//
// Built on the shared localStorage engine (form-draft.ts) — see that file
// for why this is localStorage rather than a server-side draft.
//
// Scoped per-token so two different work trials sharing a browser (e.g. a
// BM covering several trials in a day) never cross-contaminate drafts.

import { makeDraftStore, type DraftBase } from "./form-draft";

const DRAFT_VERSION = 1;

export type BmFeedbackDraftStep = "method" | "scoring" | "feedback" | "upload";

export interface BmFeedbackDraft extends DraftBase {
  step: BmFeedbackDraftStep;
  selectedRole: "BM" | "Incharge" | null;
  scores: {
    technical: number;
    patient: number;
    culture: number;
  };
  comments: {
    commentCulture: string;
    commentPatient: string;
    commentTechnical: string;
    strengths: string;
    areasOfDevelopment: string;
    overallRecommendation: string;
  };
  // The uploaded file itself is a File object and can't be serialised — the
  // "upload" step restore only ever brings back the scores/recommendation
  // and asks the BM to re-attach it (see the draft-restored banner in
  // bm-feedback/page.tsx).
  uploadRecommendation: string;
}

const store = makeDraftStore<BmFeedbackDraft>("bm-feedback", DRAFT_VERSION);

export function loadDraft(token: string): BmFeedbackDraft | null {
  return store.load(token);
}

export function saveDraft(token: string, draft: Omit<BmFeedbackDraft, "version" | "savedAt">): void {
  store.save(token, draft);
}

export function clearDraft(token: string): void {
  store.clear(token);
}
