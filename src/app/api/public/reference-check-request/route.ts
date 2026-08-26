// Public, no-login route. Auth is the signed token, not a Supabase session —
// see middleware.ts, which exempts /api/public/* from the staff auth gate.
// This is Path B of the two reference-check initiation paths: the candidate
// submits their own referees' contact details; nothing is emailed out until
// a TA reviews and verifies it (see reference-checks/verify-reference-check-dialog.tsx).
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyReferenceCheckRequestToken } from "@/lib/forms/tokens";
import { loadReferenceCheckRequestData, submitReferenceCheckRequest } from "@/lib/forms/reference-check-request-form";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, "public:reference-check-request:get", { limit: 60, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;

  const token = request.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const payload = await verifyReferenceCheckRequestToken(token);
  if (!payload) return NextResponse.json({ error: "expired" }, { status: 401 });

  try {
    const data = await loadReferenceCheckRequestData(payload.candidateId);
    if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(data);
  } catch (err) {
    console.error("[api/public/reference-check-request] GET failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

const refereeSchema = z.object({
  name: z.string().trim().min(1).max(150),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(1).max(30),
});

const submitSchema = z
  .object({
    token: z.string().min(1).max(4000),
    referee1: refereeSchema,
    referee2: refereeSchema,
  })
  .refine((data) => data.referee1.email.trim().toLowerCase() !== data.referee2.email.trim().toLowerCase(), {
    message: "Referees must have different email addresses",
    path: ["referee2", "email"],
  });

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, "public:reference-check-request:post", { limit: 10, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;

  const json = await request.json().catch(() => null);
  const result = submitSchema.safeParse(json);
  if (!result.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const payload = await verifyReferenceCheckRequestToken(result.data.token);
  if (!payload) return NextResponse.json({ error: "expired" }, { status: 401 });

  try {
    const existing = await loadReferenceCheckRequestData(payload.candidateId);
    if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (existing.alreadySubmitted) return NextResponse.json({ error: "already_submitted" }, { status: 409 });

    await submitReferenceCheckRequest(payload.candidateId, {
      referee1: result.data.referee1,
      referee2: result.data.referee2,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/public/reference-check-request] POST failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
