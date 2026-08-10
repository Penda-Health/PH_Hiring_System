// Public, no-login route for the universal work-trial self-scheduling link.
// Auth is a short-lived session token issued after phone+email identity check.
// Safe to embed in ATS auto-messages — no candidate-specific data in the URL.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { signWorkTrialRequestToken, verifyWorkTrialRequestToken, signBmFeedbackToken } from "@/lib/forms/tokens";
import { listRecords, listRecordsFiltered, createRecord, updateRecord, getRecord, escapeFormulaValue } from "@/lib/airtable/client";
import { nextSequentialId } from "@/lib/airtable/route-handlers";
import { TABLE_NAMES, F } from "@/lib/airtable/field-names";
import {
  candidateFromAirtable,
  workTrialFromAirtable,
  branchFromAirtable,
  specialtyConfigFromAirtable,
} from "@/lib/airtable/mappers";
import { rateLimit } from "@/lib/rate-limit";

// ── Phone helpers ─────────────────────────────────────────────────────────────

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("254")) return digits;
  if (digits.startsWith("0")) return `254${digits.slice(1)}`;
  return `254${digits}`;
}

function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
}

// ── GET — return branch list ──────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, "public:work-trial-request:get", { limit: 60, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;

  // Maps IPS department field values to the candidate-facing cadre label.
  const DEPT_TO_CADRE: Record<string, string> = {
    "Clinical Services": "Clinical Officer",
    "Nursing":           "Nurse",
    "Pharmacy":          "Pharmacy Technician",
    "Laboratory":        "Laboratory Technician",
    "Front Office":      "Receptionist / Front Office",
    "Dental":            "Dental",
    "Sonography":        "Sonographer",
    "Reproductive Health": "Reproductive Health",
    "MCMT":              "MCMT",
  };

  try {
    const [branchRecords, specialtyRecords, openRoleRecords] = await Promise.all([
      listRecordsFiltered(TABLE_NAMES.Branches, `{${F.Branches.WORK_TRIAL_ACTIVE}}=1`),
      listRecords(TABLE_NAMES.WorkTrialSpecialtyConfig),
      // Unique cadres from live IPS open roles — deduped by department so
      // "Pharmacy Technician" appears once even if ten branches have it open.
      listRecordsFiltered(
        TABLE_NAMES.OpenRoles,
        `AND({${F.OpenRoles.SEGMENT}}='IPS',OR({${F.OpenRoles.STATUS}}='Open',{${F.OpenRoles.STATUS}}='On Hold'))`
      ),
    ]);
    const branches = branchRecords.map(branchFromAirtable).map((b) => ({
      id: b.id,
      name: b.name,
      city: b.city,
      address: b.address,
      mapPinUrl: b.mapPinUrl,
      bmName: b.branchManager,
      bmPhone: b.bmPhone,
    }));
    const specialtyConfigs = specialtyRecords
      .map(specialtyConfigFromAirtable)
      .filter((s) => s.active);

    // Build deduplicated cadre list from open roles (MCMT is internal — excluded)
    const EXCLUDED_DEPTS = new Set(["MCMT"]);
    const seenDepts = new Set<string>();
    const availableCadres: string[] = [];
    for (const r of openRoleRecords) {
      const dept = String(r.fields[F.OpenRoles.DEPARTMENT] ?? "").trim();
      if (!dept || EXCLUDED_DEPTS.has(dept) || seenDepts.has(dept)) continue;
      seenDepts.add(dept);
      const cadre = DEPT_TO_CADRE[dept] ?? dept;
      if (!availableCadres.includes(cadre)) availableCadres.push(cadre);
    }
    if (!availableCadres.includes("Other")) availableCadres.push("Other");

    return NextResponse.json({ branches, specialtyConfigs, availableCadres });
  } catch (err) {
    console.error("[api/public/work-trial-request] GET failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

// ── POST schemas ──────────────────────────────────────────────────────────────

const identifySchema = z.object({
  step: z.literal("identify"),
  name: z.string().trim().min(2).max(120),
  phone: z.string().regex(/^7\d{8}$/, "Phone must be 9 digits starting with 7"),
  email: z.string().trim().toLowerCase().email().max(255),
});

const scheduleSchema = z.object({
  step: z.literal("schedule"),
  sessionToken: z.string().min(1).max(4000),
  branchId: z.string().min(1).max(100),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  roleCategory: z.enum(["General", "Specialist"]).optional(),
  specialty: z.string().trim().max(80).optional(),
});

const postSchema = z.union([identifySchema, scheduleSchema]);

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Generous overall budget (covers both steps of a normal booking flow,
  // plus a few retries), tightened further below for the identify step
  // specifically, since it doubles as a candidate lookup by phone/email.
  const limited = rateLimit(request, "public:work-trial-request:post", { limit: 40, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;

  const json = await request.json().catch(() => null);
  const result = postSchema.safeParse(json);
  if (!result.success) {
    return NextResponse.json({ error: "invalid_request", detail: result.error.flatten() }, { status: 400 });
  }

  // ── Step 1: identify ───────────────────────────────────────────────────────
  if (result.data.step === "identify") {
    // Looking a candidate up by phone/email (even on a match against just
    // one of the two) discloses whether they have a work trial scheduled,
    // plus the branch/BM contact details — a tighter, dedicated limit here
    // makes brute-force enumeration of phone/email pairs impractical on top
    // of the general POST budget above.
    const identifyLimited = rateLimit(request, "public:work-trial-request:identify", {
      limit: 15,
      windowMs: 10 * 60 * 1000,
    });
    if (identifyLimited) return identifyLimited;

    const { name, email } = result.data;
    const phone = normalizePhone(result.data.phone);

    try {
      const escapedPhone = escapeFormulaValue(phone);
      const escapedEmail = escapeFormulaValue(email);
      const formula = `OR({${F.Candidates.PHONE}}='${escapedPhone}',{${F.Candidates.EMAIL}}='${escapedEmail}')`;
      const matches = await listRecordsFiltered(TABLE_NAMES.Candidates, formula);

      let candidate = matches.length > 0 ? candidateFromAirtable(matches[0]) : null;
      let isNew = false;

      if (!candidate) {
        isNew = true;
        const candId = await nextSequentialId(TABLE_NAMES.Candidates, { airtableField: F.Candidates.CAND_ID, prefix: "CAND", pad: 3 }, {});
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

      // Full-table scan, not listRecordsFiltered — Airtable formulas can't
      // filter a linked-record field ({Candidate}) by the linked record's ID
      // directly; a formula sees the linked record's primary field (Name)
      // text, not its recXXXX ID. Filtering by name would be unreliable
      // (not guaranteed unique) and adding a lookup field for this is a base
      // schema change, out of scope here. WorkTrials is small enough that
      // this scan is cheap in practice — flagged in case that stops holding.
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
          // branchId is a known record ID at this point — fetch it directly
          // instead of scanning the whole Branches table for it.
          const branchRecord = existingTrial.branchId ? await getRecord(TABLE_NAMES.Branches, existingTrial.branchId) : null;
          const branch = branchRecord ? branchFromAirtable(branchRecord) : null;
          selectedBranchName = branch?.name ?? null;
          selectedDate = existingTrial.date;
          selectedBranchAddress = branch?.address ?? null;
          selectedMapPinUrl = branch?.mapPinUrl ?? null;
          selectedBmName = branch?.branchManager ?? null;
          selectedBmPhone = branch?.bmPhone ?? null;
        }
      } else {
        const wtId = await nextSequentialId(TABLE_NAMES.WorkTrials, { airtableField: F.WorkTrials.WT_ID, prefix: "WT", pad: 3 }, {});
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
  const { sessionToken, branchId, date, roleCategory, specialty } = result.data;
  const payload = await verifyWorkTrialRequestToken(sessionToken);
  if (!payload) return NextResponse.json({ error: "session_expired" }, { status: 401 });

  const dayOfWeek = new Date(`${date}T00:00:00`).getDay();
  if (dayOfWeek === 0) {
    return NextResponse.json({ error: "sunday_date" }, { status: 400 });
  }

  // Day names matching Airtable Available Days choices
  const JS_DAY_TO_NAME: Record<number, string> = {
    1: "Monday", 2: "Tuesday", 3: "Wednesday", 4: "Thursday", 5: "Friday", 6: "Saturday",
  };

  try {
    // Guard against overwriting an already-booked slot — without this, a
    // replayed/duplicate POST (double submit, browser back+resend, or a
    // direct call reusing an old sessionToken) could silently reschedule a
    // trial the candidate already confirmed, out from under the branch that
    // was told about the original date.
    const existingTrialRecord = await getRecord(TABLE_NAMES.WorkTrials, payload.workTrialId);
    if (!existingTrialRecord) return NextResponse.json({ error: "not_found" }, { status: 404 });
    const existingTrial = workTrialFromAirtable(existingTrialRecord);
    if (existingTrial.branchId && existingTrial.date) {
      return NextResponse.json({ error: "already_submitted" }, { status: 409 });
    }

    // For specialist roles validate branch + day against the specialty config.
    // Sub-roles (Dentist, COHO, Dental Lead, Sonographer Incharge …) are stored
    // verbatim in the Specialty field but validated against their parent config.
    const SPECIALTY_PARENT_MAP: Record<string, string> = {
      "Dentist":              "Dental",
      "COHO":                 "Dental",
      "Dental Assistant":     "Dental",
      "Dental Lead":          "Dental",
      "Sonographer":          "Sonography",
      "Sonographer Incharge": "Sonography",
    };
    if (roleCategory === "Specialist" && specialty) {
      const configSpecialty = SPECIALTY_PARENT_MAP[specialty] ?? specialty;
      const configRecords = await listRecords(TABLE_NAMES.WorkTrialSpecialtyConfig);
      const config = configRecords
        .map(specialtyConfigFromAirtable)
        .find((s) => s.active && s.specialty === configSpecialty);

      if (config) {
        // Branch must be in the allowed list
        if (config.branchIds.length > 0 && !config.branchIds.includes(branchId)) {
          return NextResponse.json(
            { error: "invalid_branch_for_specialty", message: `${specialty} work trials can only be held at specific branches.` },
            { status: 400 }
          );
        }
        // Day must be allowed
        const dayName = JS_DAY_TO_NAME[dayOfWeek];
        if (config.availableDays.length > 0 && dayName && !(config.availableDays as string[]).includes(dayName)) {
          return NextResponse.json(
            { error: "invalid_day_for_specialty", message: `${specialty} work trials are not available on ${dayName}s.` },
            { status: 400 }
          );
        }
      }
    }

    const branchRecord = await getRecord(TABLE_NAMES.Branches, branchId);
    if (!branchRecord) return NextResponse.json({ error: "invalid_branch" }, { status: 400 });
    const branch = branchFromAirtable(branchRecord);

    // Generate a long-lived BM scoring link (90 days) stored on the record.
    // Airtable automations read {BM Scoring Link} directly — no code needed to send it.
    const bmToken = await signBmFeedbackToken({ workTrialId: payload.workTrialId, candidateId: payload.candidateId }, "90d");
    const bmScoringLink = appUrl() ? `${appUrl()}/bm-feedback?token=${bmToken}` : "";

    await updateRecord(TABLE_NAMES.WorkTrials, payload.workTrialId, {
      [F.WorkTrials.BRANCH]: [branchId],
      [F.WorkTrials.DATE]: date,
      [F.WorkTrials.SUPERVISOR]: branch.branchManager || undefined,
      ...(bmScoringLink ? { [F.WorkTrials.BM_SCORING_LINK]: bmScoringLink } : {}),
      ...(roleCategory ? { [F.WorkTrials.ROLE_CATEGORY]: roleCategory } : {}),
      ...(specialty ? { [F.WorkTrials.SPECIALTY]: specialty } : {}),
    });

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
