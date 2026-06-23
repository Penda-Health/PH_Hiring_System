// Public, no-login route. Auth is the signed token, not a Supabase session —
// see middleware.ts, which exempts /api/public/* from the staff auth gate.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyBmFeedbackToken } from "@/lib/forms/tokens";
import { loadBmFeedbackFormData, submitArrival, submitScores } from "@/lib/forms/bm-feedback-form";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const payload = await verifyBmFeedbackToken(token);
  if (!payload) return NextResponse.json({ error: "expired" }, { status: 401 });

  try {
    const data = await loadBmFeedbackFormData(payload.workTrialId);
    if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(data);
  } catch (err) {
    console.error("[api/public/bm-feedback] GET failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

const arrivalSchema = z.object({
  token: z.string(),
  step: z.literal("arrival"),
  arrived: z.boolean(),
});

const scoringSchema = z.object({
  token: z.string(),
  step: z.literal("scoring"),
  scores: z.object({
    technical: z.number().min(0).max(100),
    patient: z.number().min(0).max(100),
    safety: z.number().min(0).max(100),
    culture: z.number().min(0).max(100),
  }),
  notes: z.string().optional(),
});

const submitSchema = z.union([arrivalSchema, scoringSchema]);

export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const result = submitSchema.safeParse(json);
  if (!result.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const payload = await verifyBmFeedbackToken(result.data.token);
  if (!payload) return NextResponse.json({ error: "expired" }, { status: 401 });

  try {
    if (result.data.step === "arrival") {
      await submitArrival(payload.workTrialId, result.data.arrived);
      return NextResponse.json({ ok: true });
    }

    const existing = await loadBmFeedbackFormData(payload.workTrialId);
    if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (existing.alreadyScored) return NextResponse.json({ error: "already_submitted" }, { status: 409 });

    const { total, passFail } = await submitScores(payload.workTrialId, result.data.scores);
    return NextResponse.json({ ok: true, total, passFail });
  } catch (err) {
    console.error("[api/public/bm-feedback] POST failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
