"use client";

// In-progress-answer persistence for the public referee form
// (src/app/referee/page.tsx) — the longest and most detail-heavy of the
// public forms (employment verification, three rated categories each with a
// written example, strengths/coaching/recommendation). A referee doing this
// as a favor, on their phone, between other things, is the person most
// likely to lose real work to a closed tab.
//
// Built on the shared localStorage engine (form-draft.ts) — see that file
// for why this is localStorage rather than a server-side draft.
//
// Scoped per-token. Only screens 2-4 (after Google identity verification)
// have anything worth restoring — screen 0 (intro) and 1 (verify) carry no
// answer data, and re-verifying is cheap/required again anyway, so a draft
// is only ever saved/loaded once `screen` is 2 or later.
//
// Field types are kept as plain string/boolean/number here rather than the
// narrow option unions declared in page.tsx (e.g. `WOULD_REHIRE_OPTIONS`) —
// those consts are local to that file, and the values stored here always
// originated from one of them, so page.tsx casts back to the narrow type at
// the point it restores each field into its own setState.

import { makeDraftStore, type DraftBase } from "./form-draft";

const DRAFT_VERSION = 1;

export interface RefereeDraft extends DraftBase {
  screen: 2 | 3 | 4;

  // Step 2 — referee & employment details
  relationship: string;
  reportingRelationship: string;
  refereeOrganization: string;
  phone: string;
  durationKnown: string;
  interactionFrequency: string;
  jobTitleRecalled: string;
  employmentFrom: string;
  employmentTo: string;
  stillEmployed: boolean;
  mainResponsibilities: string;
  reportedTo: string;
  leavingReason: string;
  wouldRehire: string;
  wouldRehireExplanation: string;

  // Step 3 — performance feedback
  executionScore: number;
  executionExample: string;
  teamworkScore: number;
  teamworkExample: string;
  communicationScore: number;
  communicationExample: string;

  // Step 4 — strengths & recommendation
  topStrengths: string;
  coachingArea: string;
  feedbackResponse: string;
  honestyConcerns: string;
  complianceIncidents: string;
  licenseStanding: string;
  preferPhoneNumber: string;
  recommendHire: string;
  notes: string;
  consentToContact: boolean;
}

const store = makeDraftStore<RefereeDraft>("referee", DRAFT_VERSION);

export function loadDraft(token: string): RefereeDraft | null {
  return store.load(token);
}

export function saveDraft(token: string, draft: Omit<RefereeDraft, "version" | "savedAt">): void {
  store.save(token, draft);
}

export function clearDraft(token: string): void {
  store.clear(token);
}
