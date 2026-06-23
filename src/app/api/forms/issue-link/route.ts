// Called by an Airtable automation's "Run script" step (via fetch) when a
// candidate's Stage changes to "Work Trial" or when a Work Trial's branch
// manager needs to confirm arrival / submit scores. Returns a signed link
// the automation's "Send email" step embeds in the candidate/BM email.
// Authenticated with a static bearer secret (FORMS_ISSUE_SECRET) rather than
// Supabase — Airtable automations can't carry a staff login session.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getRecord } from "@/lib/airtable/client";
import { TABLE_NAMES } from "@/lib/airtable/field-names";
import { workTrialFromAirtable } from "@/lib/airtable/mappers";
import { signWorkTrialToken, signBmFeedbackToken } from "@/lib/forms/tokens";

const schema = z.object({
  type: z.enum(["work-trial", "bm-feedback"]),
  workTrialId: z.string().min(1),
});

function appUrl() {
  const base = process.env.NEXT_PUBLIC_APP_URL;
  if (!base) throw new Error("Missing NEXT_PUBLIC_APP_URL environment variable.");
  return base.replace(/\/$/, "");
}

export async function POST(request: NextRequest) {
  const secret = process.env.FORMS_ISSUE_SECRET;
  if (!secret) {
    console.error("[api/forms/issue-link] Missing FORMS_ISSUE_SECRET environment variable.");
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => null);
  const result = schema.safeParse(json);
  if (!result.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  try {
    const record = await getRecord(TABLE_NAMES.WorkTrials, result.data.workTrialId);
    const trial = workTrialFromAirtable(record);

    const token =
      result.data.type === "work-trial"
        ? await signWorkTrialToken({ workTrialId: trial.id, candidateId: trial.candidateId })
        : await signBmFeedbackToken({ workTrialId: trial.id, candidateId: trial.candidateId });

    const path = result.data.type === "work-trial" ? "/work-trial" : "/bm-feedback";
    return NextResponse.json({ url: `${appUrl()}${path}?token=${token}` });
  } catch (err) {
    console.error("[api/forms/issue-link] failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
