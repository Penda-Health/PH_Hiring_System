// Vercel cron job — runs daily at 09:00 EAT (06:00 UTC).
// Scans work trials where the date has passed but scores haven't been submitted,
// then sends reminder emails to the Branch Manager using the two reminder slots
// already stored in the WorkTrial record (reminder12hSent, escalation24hSent).
//
// reminder12hSent  → sent when trial was yesterday (next-morning check-in)
// escalation24hSent → sent when trial was 2+ days ago (36h escalation)
//
// Add to vercel.json:
//   { "crons": [{ "path": "/api/cron/work-trial-reminders", "schedule": "0 6 * * *" }] }
import { NextRequest, NextResponse } from "next/server";
import { listRecords, updateRecord, getRecord } from "@/lib/airtable/client";
import { TABLE_NAMES, F } from "@/lib/airtable/field-names";
import { workTrialFromAirtable, branchFromAirtable, candidateFromAirtable } from "@/lib/airtable/mappers";
import { sendBmScoreReminder } from "@/lib/email";
import { signBmFeedbackToken } from "@/lib/forms/tokens";

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
}

export async function GET(request: NextRequest) {
  // Secured: Vercel automatically sets CRON_SECRET and passes it as Bearer token.
  const authHeader = request.headers.get("authorization");
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  const twoDaysAgo = new Date();
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  const twoDaysAgoStr = twoDaysAgo.toISOString().slice(0, 10);

  const allTrials = await listRecords(TABLE_NAMES.WorkTrials);
  const branchRecords = await listRecords(TABLE_NAMES.Branches);
  const branches = branchRecords.map(branchFromAirtable);

  let reminder1Sent = 0;
  let reminder2Sent = 0;

  for (const raw of allTrials) {
    const trial = workTrialFromAirtable(raw);

    // Skip if already scored or no date
    if (!trial.date || trial.formSubmittedAt || trial.passFail !== "Pending") continue;
    // Skip if date is today or in the future
    if (trial.date >= todayStr) continue;

    const branch = branches.find((b) => b.id === trial.branchId);
    if (!branch?.bmEmail) continue;

    const candidateRecord = await getRecord(TABLE_NAMES.Candidates, trial.candidateId);
    const candidate = candidateRecord ? candidateFromAirtable(candidateRecord) : null;
    const candidateName = candidate?.name ?? "the candidate";

    const token = await signBmFeedbackToken({ workTrialId: trial.id, candidateId: trial.candidateId });
    const scoringLink = `${appUrl()}/bm-feedback?token=${token}`;

    // Reminder 1: trial was yesterday, next-morning nudge
    if (trial.date === yesterdayStr && !trial.reminder12hSent) {
      await sendBmScoreReminder({
        bmEmail: branch.bmEmail,
        bmName: branch.branchManager,
        branchName: branch.name,
        candidateName,
        date: trial.date,
        scoringLink,
        reminderNumber: 1,
      });
      await updateRecord(TABLE_NAMES.WorkTrials, trial.id, {
        [F.WorkTrials.REMINDER_12H_SENT]: true,
      });
      reminder1Sent++;
    }

    // Reminder 2: trial was 2+ days ago, 36h escalation
    if (trial.date <= twoDaysAgoStr && trial.reminder12hSent && !trial.escalation24hSent) {
      await sendBmScoreReminder({
        bmEmail: branch.bmEmail,
        bmName: branch.branchManager,
        branchName: branch.name,
        candidateName,
        date: trial.date,
        scoringLink,
        reminderNumber: 2,
      });
      await updateRecord(TABLE_NAMES.WorkTrials, trial.id, {
        [F.WorkTrials.ESCALATION_24H_SENT]: true,
      });
      reminder2Sent++;
    }
  }

  return NextResponse.json({ ok: true, reminder1Sent, reminder2Sent });
}
