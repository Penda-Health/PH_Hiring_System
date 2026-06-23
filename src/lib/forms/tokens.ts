// Server-only. Signs/verifies the JWTs embedded in public form links
// (candidate work-trial selection, branch-manager feedback). No Supabase
// session exists on these routes — the token itself is the auth.
import { SignJWT, jwtVerify } from "jose";

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

export async function signWorkTrialToken(payload: Omit<WorkTrialTokenPayload, "type">): Promise<string> {
  return new SignJWT({ type: "work-trial", ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("14d")
    .sign(secret());
}

export async function signBmFeedbackToken(payload: Omit<BmFeedbackTokenPayload, "type">): Promise<string> {
  return new SignJWT({ type: "bm-feedback", ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5d")
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
