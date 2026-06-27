// Public, no-login route. Auth is the signed token, not a Supabase session —
// see middleware.ts, which exempts /api/public/* from the staff auth gate.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyConfirmEmploymentToken } from "@/lib/forms/tokens";
import { loadConfirmEmploymentFormData, submitEmploymentConfirmation } from "@/lib/forms/confirm-employment-form";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const payload = await verifyConfirmEmploymentToken(token);
  if (!payload) return NextResponse.json({ error: "expired" }, { status: 401 });

  try {
    const data = await loadConfirmEmploymentFormData(payload.newEmployeeId);
    if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(data);
  } catch (err) {
    console.error("[api/public/confirm-employment] GET failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

const submitSchema = z.object({
  token: z.string(),
  confirmed: z.boolean(),
});

export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const result = submitSchema.safeParse(json);
  if (!result.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const payload = await verifyConfirmEmploymentToken(result.data.token);
  if (!payload) return NextResponse.json({ error: "expired" }, { status: 401 });

  try {
    const existing = await loadConfirmEmploymentFormData(payload.newEmployeeId);
    if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (existing.alreadySubmitted) return NextResponse.json({ error: "already_submitted" }, { status: 409 });

    await submitEmploymentConfirmation(payload.newEmployeeId, result.data.confirmed);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/public/confirm-employment] POST failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
