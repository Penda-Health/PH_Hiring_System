// Server-only. Signs/verifies the JWTs embedded in public form links
// (candidate work-trial selection, branch-manager feedback). No Supabase
// session exists on these routes — the token itself is the auth.
import { SignJWT, errors, jwtVerify } from "jose";

function secret() {
  const value = process.env.PUBLIC_FORM_JWT_SECRET;
  if (!value) throw new Error("Missing PUBLIC_FORM_JWT_SECRET environment variable.");
  return new TextEncoder().encode(value);
}

export type WorkTrialTokenPayload = {
  type: "work-trial";
  workTrialId: string;
  candidateId: string;
};

export type BmFeedbackTokenPayload = {
  type: "bm-feedback";
  workTrialId: string;
  candidateId: string;
};

export type RefereeTokenPayload = {
  type: "referee";
  refCheckId: string;
  candidateId: string;
  refereeNum: 1 | 2 | 3 | 4;
};

export type ConfirmEmploymentTokenPayload = {
  type: "confirm-employment";
  newEmployeeId: string;
};

export type WorkTrialRequestTokenPayload = {
  type: "work-trial-request";
  candidateId: string;
  workTrialId: string;
  // Carried so the schedule step can send email without a second Airtable lookup
  candidateName?: string;
  candidatePhone?: string;
  candidateEmail?: string;
};

// Sent to a candidate once they reach the "Reference Check" stage, letting
// them submit their own two referees' contact details (Path B — see
// SETUP.md's "Two ways to start a reference check"). Unlike RefereeToken,
// this doesn't point at an existing Reference Checks record — one doesn't
// exist yet, the POST creates it (unverified, no emails sent).
export type ReferenceCheckRequestTokenPayload = {
  type: "reference-check-request";
  candidateId: string;
};

export async function signWorkTrialToken(payload: Omit<WorkTrialTokenPayload, "type">): Promise<string> {
  return new SignJWT({ type: "work-trial", ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(secret());
}

export async function signBmFeedbackToken(
  payload: Omit<BmFeedbackTokenPayload, "type">,
  expiresIn = "5d"
): Promise<string> {
  return new SignJWT({ type: "bm-feedback", ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret());
}

export async function signRefereeToken(payload: Omit<RefereeTokenPayload, "type">): Promise<string> {
  return new SignJWT({ type: "referee", ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(secret());
}

export async function signConfirmEmploymentToken(
  payload: Omit<ConfirmEmploymentTokenPayload, "type">
): Promise<string> {
  return new SignJWT({ type: "confirm-employment", ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
}

export async function verifyWorkTrialToken(token: string): Promise<WorkTrialTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.type !== "work-trial") return null;
    return payload as unknown as WorkTrialTokenPayload;
  } catch {
    return null;
  }
}

export async function verifyBmFeedbackToken(token: string): Promise<BmFeedbackTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.type !== "bm-feedback") return null;
    return payload as unknown as BmFeedbackTokenPayload;
  } catch {
    return null;
  }
}

export async function verifyRefereeToken(token: string): Promise<RefereeTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.type !== "referee") return null;
    return payload as unknown as RefereeTokenPayload;
  } catch {
    return null;
  }
}

export async function verifyConfirmEmploymentToken(token: string): Promise<ConfirmEmploymentTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.type !== "confirm-employment") return null;
    return payload as unknown as ConfirmEmploymentTokenPayload;
  } catch {
    return null;
  }
}

export async function signWorkTrialRequestToken(
  payload: Omit<WorkTrialRequestTokenPayload, "type">
): Promise<string> {
  return new SignJWT({ type: "work-trial-request", ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30m")
    .sign(secret());
}

export async function verifyWorkTrialRequestToken(token: string): Promise<WorkTrialRequestTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.type !== "work-trial-request") return null;
    return payload as unknown as WorkTrialRequestTokenPayload;
  } catch {
    return null;
  }
}

export async function signReferenceCheckRequestToken(
  payload: Omit<ReferenceCheckRequestTokenPayload, "type">
): Promise<string> {
  return new SignJWT({ type: "reference-check-request", ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(secret());
}

export async function verifyReferenceCheckRequestToken(
  token: string
): Promise<ReferenceCheckRequestTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.type !== "reference-check-request") return null;
    return payload as unknown as ReferenceCheckRequestTokenPayload;
  } catch {
    return null;
  }
}

// Emailed to the current approver of a requisition (see
// src/lib/requisitions/approval.ts). Bound to one step: once that step is
// decided the requisition's currentApproverIndex moves on and the decision
// route rejects this token as stale, so a forwarded or re-opened old link
// can't act on a later step. Possession alone isn't enough either — the
// approver must also sign in with the step's Google account.
export type RequisitionApprovalTokenPayload = {
  type: "requisition-approval";
  requisitionId: string;
  stepIndex: number;
};

export async function signRequisitionApprovalToken(
  payload: Omit<RequisitionApprovalTokenPayload, "type">
): Promise<string> {
  // No expiry, at HR's request: approvers sometimes open the email weeks
  // later. The link still can't be misused, because it only works while its
  // step is the current one and the approver must sign in with that step's
  // Google account.
  return new SignJWT({ type: "requisition-approval", ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .sign(secret());
}

/**
 * Approval links carry the JWT hex-encoded, so the URL is only [0-9a-f].
 * A raw JWT contains "_" and "-", and email clients and Markdown renderers
 * cut links short at those characters.
 */
export function encodeApprovalTokenForLink(token: string): string {
  return Buffer.from(token, "utf8").toString("hex");
}

/** Accepts both the hex link form and a raw JWT (links sent before the switch). */
function decodeApprovalToken(token: string): string {
  const t = token.trim();
  return /^[0-9a-f]+$/i.test(t) && t.length % 2 === 0 ? Buffer.from(t, "hex").toString("utf8") : t;
}

export async function verifyRequisitionApprovalToken(token: string): Promise<RequisitionApprovalTokenPayload | null> {
  token = decodeApprovalToken(token);
  try {
    const { payload } = await jwtVerify(token, secret());
    if (payload.type !== "requisition-approval") return null;
    return payload as unknown as RequisitionApprovalTokenPayload;
  } catch (err) {
    // Links sent before expiry was removed carry a 30-day exp. jose checks
    // the signature before the claims, so a JWTExpired here is still a
    // genuine token. Accept it.
    if (err instanceof errors.JWTExpired && err.payload.type === "requisition-approval") {
      return err.payload as unknown as RequisitionApprovalTokenPayload;
    }
    return null;
  }
}
