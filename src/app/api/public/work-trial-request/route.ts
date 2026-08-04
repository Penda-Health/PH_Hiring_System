// Public, no-login route for the universal work-trial self-scheduling link.
// Auth is a short-lived session token issued after phone+email identity check.
// Safe to embed in ATS auto-messages — no candidate-specific data in the URL.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { signWorkTrialRequestToken, verifyWorkTrialRequestToken } from "@/lib/forms/tokens";
import { listRecords, listRecordsFiltered, createRecord, updateRecord } from "@/lib/airtable/client";
import { TABLE_NAMES, F } from "@/lib/airtable/field-names";
import {
  candidateFromAirtable,
  workTrialFromAirtable,
  branchFromAirtable,
} from "@/lib/airtable/mappers";
import {
  sendBmWorkTrialNotification,
  sendCandidateWorkTrialConfirmation,
} from "@/lib/email";

// ── Phone helpers ─────────────────────────────────────────────────────────────

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  return `254${digits}`;
}

// ── Sequential ID helpers ─────────────────────────────────────────────────────

async function nextId(tableName: string, field: string, prefix: string, pad = 3): Promise<string> {
  const records = await listRecords(tableName);
  const pattern = new RegExp(`^${prefix}-(\\d+)$`, "i");
  let max = 0;
  for (const r of records) {
    const v = r.fields[field];
    const m = typeof v === "string" ? v.match(pattern) : null;
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `${prefix}-${String(max + 1).padStart(pad, "0")}`;
}

// ── GET — return branch list ──────────────────────────────────────────────────

export async function GET() {
  try {
    const records = await listRecords(TABLE_NAMES.Branches);
    const branches = records.map(branchFromAirtable).map((b) => ({
      id: b.id,
      name: b.name,
      city: b.city,
      address: b.address,
      mapPinUrl: b.mapPinUrl,
      bmName: b.branchManager,
      bmPhone: b.bmPhone,
    }));
    return NextResponse.json({ branches });
  } catch (err) {
    console.error("[api/public/work-trial-request] GET failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

// ── POST schemas ──────────────────────────────────────────────────────────────

const identifySchema = z.object({
  step: z.literal("identify"),
  name: z.string().min(2).max(120),
  phone: z.string().regex(/^7\d{8}$/, "Phone must be 9 digits starting with 7"),
  email: z.string().email(),
});

const scheduleSchema = z.object({
  step: z.literal("schedule"),
  sessionToken: z.string(),
  branchId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
});

const postSchema = z.union([identifySchema, scheduleSchema]);

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const result = postSchema.safeParse(json);
  if (!result.success) {
    return NextResponse.json({ error: "invalid_request", detail: result.error.flatten() }, { status: 400 });
  }

  // ── Step 1: identify ───────────────────────────────────────────────────────
  if (result.data.step === "identify") {
    const { name, email } = result.data;
    const phone = normalizePhone(result.data.phone);

    try {
      const escapedPhone = phone.replace(/'/g, "\\'");
      const escapedEmail = email.replace(/'/g, "\\'");
      const formula = `OR({${F.Candidates.PHONE}}='${escapedPhone}',{${F.Candidates.EMAIL}}='${escapedEmail}')`;
      const matches = await listRecordsFiltered(TABLE_NAMES.Candidates, formula);

      let candidate = matches.length > 0 ? candidateFromAirtable(matches[0]) : null;
      let isNew = false;

      if (!candidate) {
        isNew = true;
        const candId = await nextId(TABLE_NAMES.Candidates, F.Candidates.CAND_ID, "CAND", 3);
        const newRecord = await createRecord(TABLE_NAMES.Candidates, {
          [F.Candidates.CAND_ID]: candId,
          [F.Candidates.NAME]: name,
          [F.Candidates.PHONE]: phone,
          [F.Candidates.EMAIL]: email,
          [F.Candidates.STAGE]: "Work Trial",
          [F.Candidates.SOURCE]: "Self Referral",
          [F.Candidates.CREATED_AT]: new Date().toISOString().slice(0, 10),
        });
        candidate = candidateFromAirtable(newRecord);
      } else if (candidate.stage !== "Work Trial") {
        await updateRecord(TABLE_NAMES.Candidates, candidate.id, {
          [F.Candidates.STAGE]: "Work Trial",
        });
      }

      const allTrials = await listRecords(TABLE_NAMES.WorkTrials);
      const existingTrial = allTrials
        .map(workTrialFromAirtable)
        .find((t) => t.candidateId === candidate!.id);

      let workTrialId: string;
      let alreadyScheduled = false;
      let selectedBranchName: string | null = null;
      let selectedDate: string | null = null;
      let selectedBranchAddress: string | null = null;
      let selectedMapPinUrl: string | null = null;
      let selectedBmName: string | null = null;
      let selectedBmPhone: string | null = null;

      if (existingTrial) {
        workTrialId = existingTrial.id;
        alreadyScheduled = Boolean(existingTrial.branchId && existingTrial.date);
        if (alreadyScheduled) {
          const branchRecords = await listRecords(TABLE_NAMES.Branches);
          const branch = branchRecords
            .map(branchFromAirtable)
            .find((b) => b.id === existingTrial.branchId);
          selectedBranchName = branch?.name ?? null;
          selectedDate = existingTrial.date;
          selectedBranchAddress = branch?.address ?? null;
          selectedMapPinUrl = branch?.mapPinUrl ?? null;
          selectedBmName = branch?.branchManager ?? null;
          selectedBmPhone = branch?.bmPhone ?? null;
        }
      } else {
        const wtId = await nextId(TABLE_NAMES.WorkTrials, F.WorkTrials.WT_ID, "WT", 3);
        const newTrial = await createRecord(TABLE_NAMES.WorkTrials, {
          [F.WorkTrials.WT_ID]: wtId,
          [F.WorkTrials.CANDIDATE]: [candidate.id],
          [F.WorkTrials.CREATED_AT]: new Date().toISOString().slice(0, 10),
          [F.WorkTrials.PASS_FAIL]: "Pending",
        });
        workTrialId = newTrial.id;
      }

      const sessionToken = await signWorkTrialRequestToken({
        candidateId: candidate.id,
        workTrialId,
        candidateName: candidate.name,
        candidatePhone: phone,
        candidateEmail: email,
      });

      return NextResponse.json({
        sessionToken,
        candidateName: candidate.name,
        isNew,
        alreadyScheduled,
        selectedBranchName,
        selectedDate,
        selectedBranchAddress,
        selectedMapPinUrl,
        selectedBmName,
        selectedBmPhone,
      });
    } catch (err) {
      console.error("[api/public/work-trial-request] identify failed:", err);
      return NextResponse.json({ error: "server_error" }, { status: 500 });
    }
  }

  // ── Step 2: schedule ───────────────────────────────────────────────────────
  const { sessionToken, branchId, date } = result.data;
  const payload = await verifyWorkTrialRequestToken(sessionToken);
  if (!payload) return NextResponse.json({ error: "session_expired" }, { status: 401 });

  const dayOfWeek = new Date(`${date}T00:00:00`).getDay();
  if (dayOfWeek === 0) {
    return NextResponse.json({ error: "sunday_date" }, { status: 400 });
  }

  try {
    const branchRecords = await listRecords(TABLE_NAMES.Branches);
    const branch = branchRecords.map(branchFromAirtable).find((b) => b.id === branchId);
    if (!branch) return NextResponse.json({ error: "invalid_branch" }, { status: 400 });

    await updateRecord(TABLE_NAMES.WorkTrials, payload.workTrialId, {
      [F.WorkTrials.BRANCH]: [branchId],
      [F.WorkTrials.DATE]: date,
      [F.WorkTrials.SUPERVISOR]: branch.branchManager || undefined,
    });

    // Build scoring link for BM notification
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
    const scoringLink = appUrl
      ? `${appUrl}/api/forms/get-link?type=bm-feedback&workTrialId=${payload.workTrialId}&candidateId=${payload.candidateId}`
      : "";

    // Fire and forget — don't fail the schedule if emails fail
    const candidateName = payload.candidateName ?? "";
    const candidatePhone = payload.candidatePhone ?? "";
    const candidateEmail = payload.candidateEmail ?? "";

    if (branch.bmEmail) {
      sendBmWorkTrialNotification({
        bmEmail: branch.bmEmail,
        bmName: branch.branchManager,
        branchName: branch.name,
        candidateName,
        candidatePhone,
        candidateEmail,
        date,
        scoringLink,
      }).catch((e) => console.error("[email] BM notification failed:", e));
    }

    if (candidateEmail) {
      sendCandidateWorkTrialConfirmation({
        candidateEmail,
        candidateName,
        branchName: branch.name,
        branchAddress: branch.address,
        mapPinUrl: branch.mapPinUrl,
        bmName: branch.branchManager,
        bmPhone: branch.bmPhone,
        date,
      }).catch((e) => console.error("[email] Candidate confirmation failed:", e));
    }

    return NextResponse.json({
      ok: true,
      branchName: branch.name,
      branchAddress: branch.address,
      mapPinUrl: branch.mapPinUrl,
      bmName: branch.branchManager,
      bmPhone: branch.bmPhone,
      date,
    });
  } catch (err) {
    console.error("[api/public/work-trial-request] schedule failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
