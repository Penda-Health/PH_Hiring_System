"use client";

// In-progress-answer persistence for the public referee form
// (src/app/referee/page.tsx) — the longest and most detail-heavy of the
// public forms (employment verification, three rated categories each with a
// written example, strengths/coaching/recommendation). A referee doing this
// as a favor, on their phone, between other things, is the person most
// likely to lose real work to a closed tab.
//
// Built on the shared localStorage engine (form-draft.ts) for the fast,
// synchronous local copy. On top of that, this module also debounces a
// best-effort sync of the same draft to this referee's Airtable record
// (Referee{N} Draft Json — see field-names.ts and saveRefereeDraft in
// referee-form.ts), so a link opened on a second device can resume rather
// than restart. localStorage stays the primary copy — the remote copy is
// purely so a *different* browser/device has something to restore from;
// see loadBestDraft, which reconciles the two by whichever was saved more
// recently.
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

// Debounced independently of however often the caller's own effect invokes
// saveDraft() (page.tsx already debounces that by 500ms) — a referee typing
// through a long written example would otherwise fire a network request on
// every pause. 4s trades a little staleness for far fewer Airtable writes.
// Best-effort: any failure (offline, rate-limited, expired token) is a
// silent no-op — the localStorage copy saved just above is unaffected, and
// this never surfaces an error mid-form.
const REMOTE_SYNC_DEBOUNCE_MS = 4000;
const remoteSyncTimers = new Map<string, ReturnType<typeof setTimeout>>();

function syncDraftToServer(token: string, draft: RefereeDraft): void {
  const pending = remoteSyncTimers.get(token);
  if (pending) clearTimeout(pending);
  const handle = setTimeout(() => {
    remoteSyncTimers.delete(token);
    fetch("/api/public/referee", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, draft: JSON.stringify(draft) }),
      keepalive: true,
    }).catch(() => {
      // Offline, rate-limited, or the token expired mid-fill — nothing to
      // do; see the doc comment above.
    });
  }, REMOTE_SYNC_DEBOUNCE_MS);
  remoteSyncTimers.set(token, handle);
}

export function loadDraft(token: string): RefereeDraft | null {
  return store.load(token);
}

export function saveDraft(token: string, draft: Omit<RefereeDraft, "version" | "savedAt">): void {
  store.save(token, draft);
  // Re-read rather than re-stamping our own savedAt here, so the synced
  // copy carries the exact timestamp form-draft.ts just wrote — that's what
  // loadBestDraft compares against the remote copy's own timestamp later.
  const saved = store.load(token);
  if (saved) syncDraftToServer(token, saved);
}

export function clearDraft(token: string): void {
  store.clear(token);
  const pending = remoteSyncTimers.get(token);
  if (pending) {
    clearTimeout(pending);
    remoteSyncTimers.delete(token);
  }
}

// Parses the opaque draft blob the server hands back on GET (see route.ts /
// saveRefereeDraft) — the exact same shape as a localStorage draft, just
// synced from another device. A parse failure or version mismatch (an old
// draft shape from before a version bump) is treated as "no remote draft"
// rather than thrown, matching form-draft.ts's own load().
function parseRemoteDraft(raw: string | null | undefined): RefereeDraft | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as RefereeDraft;
    if (parsed.version !== DRAFT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

// Reconciles this browser's own localStorage draft against whatever this
// token's Airtable record carries in its Draft Json field, picking whichever
// was saved more recently. This is what actually delivers cross-device
// resume — a referee can start on a phone, open the same link on a laptop
// later, and land on the newer of the two instead of whichever device
// happens to be local.
export function loadBestDraft(token: string, remoteDraftJson: string | null | undefined): RefereeDraft | null {
  const local = loadDraft(token);
  const remote = parseRemoteDraft(remoteDraftJson);
  if (!local) return remote;
  if (!remote) return local;
  return Date.parse(remote.savedAt) > Date.parse(local.savedAt) ? remote : local;
}
