"use client";

// In-progress-answer persistence for the public BM feedback form
// (src/app/bm-feedback/page.tsx). A Branch Manager or Incharge filling this
// out mid-shift is very likely to get pulled away — closing the tab, losing
// signal, or the phone locking — before finishing the scoring/feedback steps.
// Those steps enforce a written-assessment minimum length, so losing that
// work is the expensive case this exists to prevent.
//
// Deliberately localStorage, not a server-side draft: it's zero extra
// surface on the token-authenticated /api/public/bm-feedback route (which
// only knows about *submitted* state), and every failure mode (private
// browsing, quota, corrupt JSON) just means "no draft to restore" rather
// than a broken form. The tradeoff is it doesn't follow the BM across
// devices — acceptable since this link is opened on whatever one phone/
// tablet the BM is holding at the branch, not switched mid-fill.
//
// Scoped per-token so two different work trials sharing a browser (e.g. a
// BM covering several trials in a day) never cross-contaminate drafts.

const DRAFT_VERSION = 1;

export type BmFeedbackDraftStep = "method" | "scoring" | "feedback" | "upload";

export interface BmFeedbackDraft {
  version: number;
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
  savedAt: string;
}

function draftKey(token: string): string {
  return `bm-feedback-draft:${token}`;
}

export function loadDraft(token: string): BmFeedbackDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(draftKey(token));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BmFeedbackDraft;
    if (parsed.version !== DRAFT_VERSION) return null;
    return parsed;
  } catch {
    // Corrupt JSON, private-browsing storage disabled, etc. — no draft.
    return null;
  }
}

export function saveDraft(token: string, draft: Omit<BmFeedbackDraft, "version" | "savedAt">): void {
  if (typeof window === "undefined") return;
  try {
    const full: BmFeedbackDraft = { ...draft, version: DRAFT_VERSION, savedAt: new Date().toISOString() };
    window.localStorage.setItem(draftKey(token), JSON.stringify(full));
  } catch {
    // Quota exceeded or storage unavailable — losing autosave silently is
    // far better than throwing out of a keystroke handler.
  }
}

export function clearDraft(token: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(draftKey(token));
  } catch {
    // Nothing to do if storage is unavailable.
  }
}
