// Public, no-login route. Auth is the signed token, not a Supabase session —
// see middleware.ts, which exempts /api/public/* from the staff auth gate.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyRefereeToken } from "@/lib/forms/tokens";
import { loadRefereeFormData, submitRefereeForm } from "@/lib/forms/referee-form";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const limited = rateLimit(request, "public:referee:get", { limit: 60, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;

  const token = request.nextUrl.searchParams.get("token");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const payload = await verifyRefereeToken(token);
  if (!payload) return NextResponse.json({ error: "expired" }, { status: 401 });

  try {
    const data = await loadRefereeFormData(payload.refCheckId, payload.refereeNum);
    if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
    return NextResponse.json(data);
  } catch (err) {
    console.error("[api/public/referee] GET failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

const submitSchema = z.object({
  token: z.string().min(1).max(4000),
  relationship: z.string().trim().min(1).max(100),
  reportingRelationship: z.enum([
    "Reported directly to me",
    "Reported to someone else, but I worked closely with them",
    "We were peers / colleagues",
    "I reported to them",
  ]),
  refereeOrganization: z.string().trim().min(1).max(200),
  phone: z.string().trim().max(30).optional(),
  durationKnown: z.string().trim().min(1).max(100),
  interactionFrequency: z.enum(["Daily", "A few times a week", "Weekly", "A few times a month", "Rarely"]),
  jobTitleRecalled: z.string().trim().min(1).max(150),
  employmentFrom: z.string().trim().max(40).optional(),
  employmentTo: z.string().trim().max(40).optional(),
  stillEmployed: z.boolean(),
  mainResponsibilities: z.string().trim().min(10).max(2000),
  reportedTo: z.string().trim().max(150).optional(),
  leavingReason: z.enum(["Still employed there", "Resigned", "Contract ended", "Laid off / restructuring", "Terminated", "Not sure"]),
  executionScore: z.number().int().min(1).max(5),
  executionExample: z.string().trim().min(100).max(2000),
  teamworkScore: z.number().int().min(1).max(5),
  teamworkExample: z.string().trim().min(100).max(2000),
  communicationScore: z.number().int().min(1).max(5),
  communicationExample: z.string().trim().min(100).max(2000),
  wouldRehire: z.enum(["Yes", "With reservations", "No"]),
  // Required only when the answer isn't an unqualified "Yes" — enforced
  // server-side below since it depends on another field's value.
  wouldRehireExplanation: z.string().trim().max(2000).optional(),
  topStrengths: z.string().trim().min(10).max(2000),
  coachingArea: z.string().trim().min(50).max(2000),
  feedbackResponse: z.enum(["Openly, and applied it", "Mixed", "Defensively"]),
  honestyConcerns: z.enum(["No concerns", "Some concerns", "Prefer to discuss by phone"]),
  // Clinical (IPS) roles only — validated as required server-side below once the
  // candidate's segment is known; optional here since SO referees never send them.
  complianceIncidents: z.enum(["None that I know of", "Yes", "Prefer to discuss by phone"]).optional(),
  licenseStanding: z.enum(["Yes", "No", "N/A", "Not sure"]).optional(),
  preferPhoneNumber: z.string().trim().max(30).optional(),
  recommendHire: z.enum(["Strongly Recommend", "Recommend", "Recommend with Reservations", "Do Not Recommend"]),
  consentToContact: z.boolean(),
  notes: z.string().trim().max(2000).optional(),
});

export async function POST(request: NextRequest) {
  const limited = rateLimit(request, "public:referee:post", { limit: 10, windowMs: 10 * 60 * 1000 });
  if (limited) return limited;

  const json = await request.json().catch(() => null);
  const result = submitSchema.safeParse(json);
  if (!result.success) return NextResponse.json({ error: "invalid_request" }, { status: 400 });

  const payload = await verifyRefereeToken(result.data.token);
  if (!payload) return NextResponse.json({ error: "expired" }, { status: 401 });

  try {
    const existing = await loadRefereeFormData(payload.refCheckId, payload.refereeNum);
    if (!existing) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (existing.alreadySubmitted) return NextResponse.json({ error: "already_submitted" }, { status: 409 });
    // Never trust a client-side "I verified" flag — re-check server-side
    // that a matching Google sign-in (or a TA override) was actually
    // persisted against this referee slot. See google-verify.ts.
    if (!existing.googleVerified) {
      return NextResponse.json({ error: "google_verification_required" }, { status: 403 });
    }
    // Compliance/licensing questions only apply to clinical (IPS) roles — enforce
    // that server-side rather than trusting the client to have gated its own UI.
    if (existing.segment === "IPS" && (!result.data.complianceIncidents || !result.data.licenseStanding)) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }
    // The explanation is only shown/required by the client when the answer
    // isn't an unqualified "Yes" — re-enforced here since it's a
    // cross-field rule zod's flat shape can't express on its own.
    if (result.data.wouldRehire !== "Yes" && !result.data.wouldRehireExplanation) {
      return NextResponse.json({ error: "invalid_request" }, { status: 400 });
    }

    await submitRefereeForm(payload.refCheckId, payload.refereeNum, {
      relationship: result.data.relationship,
      reportingRelationship: result.data.reportingRelationship,
      refereeOrganization: result.data.refereeOrganization,
      phone: result.data.phone,
      durationKnown: result.data.durationKnown,
      interactionFrequency: result.data.interactionFrequency,
      jobTitleRecalled: result.data.jobTitleRecalled,
      employmentFrom: result.data.employmentFrom,
      employmentTo: result.data.employmentTo,
      stillEmployed: result.data.stillEmployed,
      mainResponsibilities: result.data.mainResponsibilities,
      reportedTo: result.data.reportedTo,
      leavingReason: result.data.leavingReason,
      executionScore: result.data.executionScore,
      executionExample: result.data.executionExample,
      teamworkScore: result.data.teamworkScore,
      teamworkExample: result.data.teamworkExample,
      communicationScore: result.data.communicationScore,
      communicationExample: result.data.communicationExample,
      wouldRehire: result.data.wouldRehire,
      wouldRehireExplanation: result.data.wouldRehireExplanation ?? "",
      topStrengths: result.data.topStrengths,
      coachingArea: result.data.coachingArea,
      feedbackResponse: result.data.feedbackResponse,
      honestyConcerns: result.data.honestyConcerns,
      complianceIncidents: result.data.complianceIncidents,
      licenseStanding: result.data.licenseStanding,
      preferPhoneNumber: result.data.preferPhoneNumber,
      recommendHire: result.data.recommendHire,
      consentToContact: result.data.consentToContact,
      notes: result.data.notes,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/public/referee] POST failed:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
