// Staff-authenticated version of /api/forms/issue-link.
// Lets recruitment staff copy/resend form links from the UI without needing
// the FORMS_ISSUE_SECRET (which is only for Airtable automation server-side
// calls). Uses the Supabase session instead.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signWorkTrialToken, signBmFeedbackToken, signRefereeToken } from "@/lib/forms/tokens";

const schema = z.union([
  z.object({
    type: z.enum(["work-trial", "bm-feedback"]),
    workTrialId: z.string().min(1),
    candidateId: z.string().min(1),
  }),
  z.object({
    type: z.literal("referee"),
    refCheckId: z.string().min(1),
    candidateId: z.string().min(1),
    refereeNum: z.union([z.literal(1), z.literal(2)]),
  }),
]);

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const result = schema.safeParse(json);
  if (!result.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  try {
    if (result.data.type === "referee") {
      const token = await signRefereeToken({
        refCheckId: result.data.refCheckId,
        candidateId: result.data.candidateId,
        refereeNum: result.data.refereeNum,
      });
      return NextResponse.json({ url: `${appUrl()}/referee?token=${token}` });
    }

    if (result.data.type === "bm-feedback") {
      const token = await signBmFeedbackToken({
        workTrialId: result.data.workTrialId,
        candidateId: result.data.candidateId,
      });
      return NextResponse.json({ url: `${appUrl()}/bm-feedback?token=${token}` });
    }

    const token = await signWorkTrialToken({
      workTrialId: result.data.workTrialId,
      candidateId: result.data.candidateId,
    });
    return NextResponse.json({ url: `${appUrl()}/work-trial?token=${token}` });
  } catch (err) {
    console.error("[api/forms/get-link] failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
