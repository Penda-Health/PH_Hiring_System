"use client";

// In-progress-answer persistence for the public requisition-request forms
// (src/app/requisition-request/ips/page.tsx and .../so/page.tsx) — both are
// open, shared links (no per-recipient token) filled out by internal
// @pendahealth.com staff, so like work-trial-request-draft.ts there's
// nothing to key a draft on per-submitter. Uses a single fixed slot per
// browser per segment — acceptable for the same reason as elsewhere: these
// links are filled out at one person's own desk, not passed around a kiosk
// mid-fill.
//
// IPS and SO have materially different field shapes (see types.ts), so
// they get distinct draft slots rather than sharing one shape.
//
// Built on the shared localStorage engine (form-draft.ts).

import { makeDraftStore, type DraftBase } from "./form-draft";

const DRAFT_VERSION = 1;
const DRAFT_KEY = "default";

export interface IpsRequisitionDraft extends DraftBase {
  submitterName: string;
  submitterEmail: string;
  submitterRole: string;
  gapReason: string;
  roleTitle: string;
  department: string;
  branchId: string;
  employmentType: string;
  headcount: number;
  urgency: string;
  expectedStartDate: string;
  context: string;
}

export interface SoRequisitionDraft extends DraftBase {
  submitterName: string;
  submitterEmail: string;
  submitterRole: string;
  type: string;
  roleTitle: string;
  department: string;
  headcount: number;
  level: string;
  justification: string;
  salaryMin: number | "";
  salaryMax: number | "";
  jdUrl: string;
  jdAttached: boolean;
  urgency: string;
  expectedStartDate: string;
  reasonType: string;
  jdStillCurrent: boolean;
  context: string;
  budgetEvaluationConfirmed: boolean;
}

const ipsStore = makeDraftStore<IpsRequisitionDraft>("requisition-request-ips", DRAFT_VERSION);
const soStore = makeDraftStore<SoRequisitionDraft>("requisition-request-so", DRAFT_VERSION);

export function loadIpsDraft(): IpsRequisitionDraft | null {
  return ipsStore.load(DRAFT_KEY);
}
export function saveIpsDraft(draft: Omit<IpsRequisitionDraft, "version" | "savedAt">): void {
  ipsStore.save(DRAFT_KEY, draft);
}
export function clearIpsDraft(): void {
  ipsStore.clear(DRAFT_KEY);
}

export function loadSoDraft(): SoRequisitionDraft | null {
  return soStore.load(DRAFT_KEY);
}
export function saveSoDraft(draft: Omit<SoRequisitionDraft, "version" | "savedAt">): void {
  soStore.save(DRAFT_KEY, draft);
}
export function clearSoDraft(): void {
  soStore.clear(DRAFT_KEY);
}
