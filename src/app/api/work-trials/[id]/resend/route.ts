// "Resend email" from the Work Trials board. The app has no mail service of
// its own, and every outbound email is an Airtable automation, so this route
// doesn't send anything itself. It fills the Resend fields on the trial (who
// gets it, which address, a fresh link) and then bumps Resend Requested At.
// The Airtable "Resend work trial email" automation watches only that field.
//
//   BM          → BM scoring link, defaults to the branch's BM email
//   Escalation  → BM scoring link, address must be typed in (RM, ops lead…)
//   Candidate   → candidate confirmation link, defaults to the candidate's email
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserIdentity } from "@/lib/supabase/server";
import { canEditRecruitmentData } from "@/lib/permissions";
import { signBmFeedbackToken, signWorkTrialToken } from "@/lib/forms/tokens";
import { getRecord, updateRecord } from "@/lib/airtable/client";
import { F, TABLE_NAMES } from "@/lib/airtable/field-names";

const W = F.WorkTrials;

const schema = z.object({
  recipient: z.enum(["BM", "Escalation", "Candidate"]),
  email: z.string().trim().email().optional().or(z.literal("")),
  note: z.string().trim().max(1000).optional(),
});

function appUrl() {
  const base = process.env.NEXT_PUBLIC_APP_URL;
  if (!base) throw new Error("Missing NEXT_PUBLIC_APP_URL environment variable.");
  return base.replace(/\/$/, "");
}

/** Lookup fields come back as arrays; take the first non-empty string. */
function firstString(v: unknown): string {
  if (Array.isArray(v)) return v.map((x) => (typeof x === "string" ? x.trim() : "")).find(Boolean) ?? "";
  return typeof v === "string" ? v.trim() : "";
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const me = await getCurrentUserIdentity();
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  // The email carries a scoring link, and that link grants write access to
  // the trial's scores, so sending one needs the same tier as minting it.
  if (!canEditRecruitmentData(me.role)) {
    return NextResponse.json({ error: "You don't have permission to send work trial emails." }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  const { recipient, note } = parsed.data;

  try {
    const record = await getRecord(TABLE_NAMES.WorkTrials, params.id, { fresh: true });
    if (!record) return NextResponse.json({ error: "Work trial not found." }, { status: 404 });
    const fields = record.fields as Record<string, unknown>;
    const candidateId = firstString(fields[W.CANDIDATE]);
    if (!candidateId) return NextResponse.json({ error: "This work trial has no candidate linked." }, { status: 409 });

    const fallback =
      recipient === "BM"
        ? firstString(fields[W.BM_EMAIL_LOOKUP])
        : recipient === "Candidate"
          ? firstString(fields[W.CANDIDATE_EMAIL_LOOKUP])
          : "";
    const to = (parsed.data.email || fallback).toLowerCase();
    if (!to) {
      const why =
        recipient === "Escalation"
          ? "Enter the email address to escalate to."
          : recipient === "BM"
            ? "This branch has no BM email on file. Enter one."
            : "This candidate has no email on file. Enter one.";
      return NextResponse.json({ error: why }, { status: 400 });
    }

    const link =
      recipient === "Candidate"
        ? `${appUrl()}/work-trial?token=${await signWorkTrialToken({ workTrialId: params.id, candidateId })}`
        : `${appUrl()}/bm-feedback?token=${await signBmFeedbackToken({ workTrialId: params.id, candidateId }, "90d")}`;

    // Payload first, trigger last, in separate writes, so the automation
    // never fires against a half-written record.
    await updateRecord(TABLE_NAMES.WorkTrials, params.id, {
      [W.RESEND_RECIPIENT]: recipient,
      [W.RESEND_TO_EMAIL]: to,
      [W.RESEND_LINK]: link,
      [W.RESEND_NOTE]: note || null,
      [W.RESEND_REQUESTED_BY]: me.name,
    });
    await updateRecord(TABLE_NAMES.WorkTrials, params.id, {
      [W.RESEND_REQUESTED_AT]: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true, to });
  } catch (err) {
    console.error("[api/work-trials/resend] failed:", err);
    return NextResponse.json({ error: "Couldn't queue the email. Try again." }, { status: 500 });
  }
}
