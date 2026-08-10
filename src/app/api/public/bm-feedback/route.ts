// Public, no-login route. Auth is the signed token, not a Supabase session —
// see middleware.ts, which exempts /api/public/* from the staff auth gate.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyBmFeedbackToken } from "@/lib/forms/tokens";
import {
  loadBmFeedbackFormData,
  submitArrival,
  submitScores,
  submitUploadedScores,
  approveBmScores,
  ScoreComments,
} from "@/lib/forms/bm-feedback-form";
import { WRITTEN_ASSESSMENT_MIN_LENGTH, UPLOADED_RECOMMENDATION_MIN_LENGTH } from "@/lib/work-trial-helpers";
import { rateLimit } from "@/lib/rate-limit";

// Upper bound is generous (well beyond what a genuine write-up needs) —
// it's a defense-in-depth cap against pathological payloads, not a UX limit.
const WRITTEN_ASSESSMENT_MAX_LENGTH = 5000;
const UPLOADED_RECOMMENDATION_MAX_LENGTH = 3000;

const writtenAssessmentField = z
  .string()
  .trim()
  .min(WRITTEN_ASSESSMENT_MIN_LENGTH, `Must be at least ${WRITTEN_ASSESSMENT_MIN_LENGTH} characters.`)
  .max(WRITTEN_ASSESSMENT_MAX_LENGTH, `Must be at most ${WRITTEN_ASSESSMENT_MAX_LENGTH} characters.`);

// Uploaded-form path: same numeric scores, but the six detailed fields above
// are replaced by this one shorter summary — see UPLOADED_RECOMMENDATION_MIN_LENGTH.
const uploadedRecommendationField = z
  .string()
  .trim()
  .min(UPLOADED_RECOMMENDATION_MIN_LENGTH, `Must be at least ${UPLOADED_RECOMMENDATION_MIN_LENGTH} characters.`)
  .max(UPLOADED_RECOMMENDATION_MAX_LENGTH, `Must be at most ${UPLOADED_RECOMMENDATION_MAX_LENGTH} characters.`);

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_UPLOAD_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, "public:bm-feedback:get", { limit: 60, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;

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
  token: z.string().min(1).max(4000),
  step: z.literal("arrival"),
  arrived: z.boolean(),
});

const scoringSchema = z.object({
  token: z.string().min(1).max(4000),
  step: z.literal("scoring"),
  submittedByRole: z.enum(["BM", "Incharge"]),
  scores: z.object({
    technical: z.number().min(0).max(100),
    patient: z.number().min(0).max(100),
    culture: z.number().min(0).max(100),
  }),
  comments: z.object({
    commentCulture: writtenAssessmentField,
    commentPatient: writtenAssessmentField,
    commentTechnical: writtenAssessmentField,
    strengths: writtenAssessmentField,
    areasOfDevelopment: writtenAssessmentField,
    overallRecommendation: writtenAssessmentField,
  }),
});

const approvalSchema = z.object({
  token: z.string().min(1).max(4000),
  step: z.literal("approval"),
});

const submitSchema = z.union([arrivalSchema, scoringSchema, approvalSchema]);

const uploadFieldsSchema = z.object({
  token: z.string().min(1).max(4000),
  submittedByRole: z.enum(["BM", "Incharge"]),
  scoreTechnical: z.coerce.number().min(0).max(100),
  scorePatient: z.coerce.number().min(0).max(100),
  scoreCulture: z.coerce.number().min(0).max(100),
  overallRecommendation: uploadedRecommendationField,
});

// The "upload a completed form" path — multipart because it carries a file,
// unlike every other step here which is plain JSON. Handled as a separate
// branch up front rather than folded into the zod union above, since a
// File/Blob doesn't round-trip through request.json().
async function handleUploadStep(request: NextRequest) {
  const limited = rateLimit(request, "public:bm-feedback:post", { limit: 20, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const result = uploadFieldsSchema.safeParse({
    token: form.get("token"),
    submittedByRole: form.get("submittedByRole"),
    scoreTechnical: form.get("scoreTechnical"),
    scorePatient: form.get("scorePatient"),
    scoreCulture: form.get("scoreCulture"),
    overallRecommendation: form.get("overallRecommendation"),
  });
  if (!result.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "file_too_large" }, { status: 400 });
  }
  if (!ALLOWED_UPLOAD_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "unsupported_file_type" }, { status: 400 });
  }

  const payload = await verifyBmFeedbackToken(result.data.token);
  if (!payload) return NextResponse.json({ error: "expired" }, { status: 401 });

  try {
    const existing = await loadBmFeedbackFormData(payload.workTrialId);
    if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (existing.alreadyScored) return NextResponse.json({ error: "already_submitted" }, { status: 409 });

    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    // Filename comes straight from the client (the File object's `name`) —
    // cap its length before it's stored so a pathological value can't bloat
    // the Airtable field. Content itself is unaffected either way.
    const filename = (file.name || "work-trial-form").slice(0, 255);
    const { total, passFail } = await submitUploadedScores(
      payload.workTrialId,
      { technical: result.data.scoreTechnical, patient: result.data.scorePatient, culture: result.data.scoreCulture },
      result.data.submittedByRole,
      result.data.overallRecommendation,
      { filename, contentType: file.type, base64 }
    );
    return NextResponse.json({ ok: true, total, passFail, submittedByRole: result.data.submittedByRole });
  } catch (err) {
    console.error("[api/public/bm-feedback] upload POST failed:", err);
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "server_error", detail }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if ((request.headers.get("content-type") ?? "").includes("multipart/form-data")) {
    return handleUploadStep(request);
  }

  const limited = rateLimit(request, "public:bm-feedback:post", { limit: 20, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;

  const json = await request.json().catch(() => null);
  const result = submitSchema.safeParse(json);
  if (!result.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const payload = await verifyBmFeedbackToken(result.data.token);
  if (!payload) return NextResponse.json({ error: "expired" }, { status: 401 });

  try {
    if (result.data.step === "arrival") {
      // Same idempotency guard as the scoring/approval steps below: without
      // it, a replayed/duplicate POST (double submit, browser back+resend,
      // or a direct call bypassing the client's step gate) could flip
      // arrivalMarked after scores have already been recorded against this
      // trial, leaving arrivalMarked out of sync with a Complete result.
      const existing = await loadBmFeedbackFormData(payload.workTrialId);
      if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
      if (existing.arrivalMarked !== null) {
        return NextResponse.json({ error: "already_submitted" }, { status: 409 });
      }

      await submitArrival(payload.workTrialId, result.data.arrived);
      return NextResponse.json({ ok: true });
    }

    if (result.data.step === "approval") {
      const existing = await loadBmFeedbackFormData(payload.workTrialId);
      if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
      if (!existing.pendingApproval) return NextResponse.json({ error: "not_pending_approval" }, { status: 409 });

      const { total, passFail } = await approveBmScores(payload.workTrialId);
      return NextResponse.json({ ok: true, total, passFail });
    }

    // step === "scoring"
    const existing = await loadBmFeedbackFormData(payload.workTrialId);
    if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (existing.alreadyScored) return NextResponse.json({ error: "already_submitted" }, { status: 409 });

    const { total, passFail } = await submitScores(
      payload.workTrialId,
      result.data.scores,
      result.data.submittedByRole,
      result.data.comments as ScoreComments | undefined
    );
    return NextResponse.json({ ok: true, total, passFail, submittedByRole: result.data.submittedByRole });
  } catch (err) {
    console.error("[api/public/bm-feedback] POST failed:", err);
    // Include the raw error message in the response body so the UI can surface
    // it directly — makes diagnosing Airtable field/type errors much faster.
    // This is a token-gated form (BM-only) so leaking internal error strings
    // is acceptable; remove the `detail` key once the error is resolved.
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "server_error", detail }, { status: 500 });
  }
}
