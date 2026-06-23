// Public, no-login route. Auth is the signed token, not a Supabase session —
// see middleware.ts, which exempts /api/public/* from the staff auth gate.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyWorkTrialToken } from "@/lib/forms/tokens";
import { loadWorkTrialFormData, submitWorkTrialSelection } from "@/lib/forms/work-trial-form";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const payload = await verifyWorkTrialToken(token);
  if (!payload) return NextResponse.json({ error: "expired" }, { status: 401 });

  try {
    const data = await loadWorkTrialFormData(payload.workTrialId);
    if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(data);
  } catch (err) {
    console.error("[api/public/work-trial] GET failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

const submitSchema = z.object({
  token: z.string(),
  branchId: z.string().min(1),
  date: z.string().min(1),
  notes: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const result = submitSchema.safeParse(json);
  if (!result.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const payload = await verifyWorkTrialToken(result.data.token);
  if (!payload) return NextResponse.json({ error: "expired" }, { status: 401 });

  try {
    const existing = await loadWorkTrialFormData(payload.workTrialId);
    if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (existing.alreadySubmitted) return NextResponse.json({ error: "already_submitted" }, { status: 409 });

    const branchExists = existing.branches.some((b) => b.id === result.data.branchId);
    if (!branchExists) return NextResponse.json({ error: "invalid_branch" }, { status: 400 });

    await submitWorkTrialSelection(payload.workTrialId, {
      branchId: result.data.branchId,
      date: result.data.date,
      notes: result.data.notes,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/public/work-trial] POST failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
