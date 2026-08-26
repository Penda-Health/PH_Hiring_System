// Public, no-login route. Accepts the ID token Google Identity Services
// hands back after a referee signs in on /referee, verifies it against
// Google's JWKS, and persists whether it matches the referee's email on
// file. Auth here is still the referee's signed form token (verifyRefereeToken)
// — this route just adds a second, independent identity check on top.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyRefereeToken } from "@/lib/forms/tokens";
import { loadRefereeFormData, recordGoogleVerification } from "@/lib/forms/referee-form";
import { verifyGoogleIdToken } from "@/lib/forms/google-verify";
import { rateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({
  token: z.string().min(1).max(4000),
  credential: z.string().min(1).max(8000),
});

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, "public:referee:verify-google", { limit: 20, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;

  const json = await request.json().catch(() => null);
  const result = bodySchema.safeParse(json);
  if (!result.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const payload = await verifyRefereeToken(result.data.token);
  if (!payload) return NextResponse.json({ error: "expired" }, { status: 401 });

  try {
    const existing = await loadRefereeFormData(payload.refCheckId, payload.refereeNum);
    if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (existing.alreadySubmitted) return NextResponse.json({ error: "already_submitted" }, { status: 409 });

    const identity = await verifyGoogleIdToken(result.data.credential);
    if (!identity) return NextResponse.json({ error: "invalid_google_token" }, { status: 400 });

    const { verified, refereeEmailOnFile } = await recordGoogleVerification(
      payload.refCheckId,
      payload.refereeNum,
      identity.email
    );
    return NextResponse.json({ verified, googleEmail: identity.email, refereeEmailOnFile });
  } catch (err) {
    console.error("[api/public/referee/verify-google] POST failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
