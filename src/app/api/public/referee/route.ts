// Public, no-login route. Auth is the signed token, not a Supabase session —
// see middleware.ts, which exempts /api/public/* from the staff auth gate.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyRefereeToken } from "@/lib/forms/tokens";
import { loadRefereeFormData, submitRefereeForm } from "@/lib/forms/referee-form";

export async function GET(request: NextRequest) {
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
  token: z.string(),
  relationship: z.string().min(1),
  durationKnown: z.string().min(1),
  techScore: z.number().min(1).max(5),
  reliabilityScore: z.number().min(1).max(5),
  teamworkScore: z.number().min(1).max(5),
  wouldRehire: z.enum([
    "Yes, without hesitation",
    "Yes, with some reservations",
    "No, I would not recommend them",
  ]),
  strengthExample: z.string().min(50),
  developmentAreas: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const result = submitSchema.safeParse(json);
  if (!result.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const payload = await verifyRefereeToken(result.data.token);
  if (!payload) return NextResponse.json({ error: "expired" }, { status: 401 });

  try {
    const existing = await loadRefereeFormData(payload.refCheckId, payload.refereeNum);
    if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (existing.alreadySubmitted) return NextResponse.json({ error: "already_submitted" }, { status: 409 });

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
