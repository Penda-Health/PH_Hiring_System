// Public, no-login route. Auth is the signed token, not a Supabase session —
// see middleware.ts, which exempts /api/public/* from the staff auth gate.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyRefereeToken } from "@/lib/forms/tokens";
import { loadRefereeFormData, submitRefereeForm } from "@/lib/forms/referee-form";
import { rateLimit } from "@/lib/rate-limit";
import { WRITTEN_ASSESSMENT_MIN_LENGTH } from "@/lib/work-trial-helpers";

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, "public:referee:get", { limit: 60, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;

  const token = request.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const payload = await verifyRefereeToken(token);
  if (!payload) return NextResponse.json({ error: "expired" }, { status: 401 });

  try {
    const data = await loadRefereeFormData(payload.refCheckId, payload.refereeNum);
    if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(data);
  } catch (err) {
    console.error("[api/public/referee] GET failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

const submitSchema = z.object({
  token: z.string().min(1).max(4000),
  relationship: z.string().trim().min(1).max(100),
  durationKnown: z.string().trim().min(1).max(100),
  techScore: z.number().int().min(1).max(5),
  reliabilityScore: z.number().int().min(1).max(5),
  teamworkScore: z.number().int().min(1).max(5),
  wouldRehire: z.enum([
    "Yes, without hesitation",
    "Yes, with some reservations",
    "No, I would not recommend them",
  ]),
  strengthExample: z.string().trim().min(WRITTEN_ASSESSMENT_MIN_LENGTH).max(3000),
  developmentAreas: z.string().trim().min(WRITTEN_ASSESSMENT_MIN_LENGTH).max(3000),
  notes: z.string().trim().max(2000).optional(),
});

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, "public:referee:post", { limit: 10, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;

  const json = await request.json().catch(() => null);
  const result = submitSchema.safeParse(json);
  if (!result.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const payload = await verifyRefereeToken(result.data.token);
  if (!payload) return NextResponse.json({ error: "expired" }, { status: 401 });

  try {
    const existing = await loadRefereeFormData(payload.refCheckId, payload.refereeNum);
    if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (existing.alreadySubmitted) return NextResponse.json({ error: "already_submitted" }, { status: 409 });
    // Never trust a client-side "I verified" flag — re-check server-side
    // that a matching Google sign-in (or a TA override) was actually
    // persisted against this referee slot. See google-verify.ts.
    if (!existing.googleVerified) {
      return NextResponse.json({ error: "google_verification_required" }, { status: 403 });
    }

    await submitRefereeForm(payload.refCheckId, payload.refereeNum, {
      relationship: result.data.relationship,
      durationKnown: result.data.durationKnown,
      techScore: result.data.techScore,
      reliabilityScore: result.data.reliabilityScore,
      teamworkScore: result.data.teamworkScore,
      wouldRehire: result.data.wouldRehire,
      strengthExample: result.data.strengthExample,
      developmentAreas: result.data.developmentAreas,
      notes: result.data.notes,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/public/referee] POST failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
