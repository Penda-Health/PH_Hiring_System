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

export type RefereeTokenPayload = {
  type: "referee";
  refCheckId: string;
  candidateId: string;
  refereeNum: 1 | 2;
};

export type ConfirmEmploymentTokenPayload = {
  type: "confirm-employment";
  newEmployeeId: string;
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
