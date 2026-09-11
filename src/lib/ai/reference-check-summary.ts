// Generates the AI "intelligence and insights layer" for a reference check:
// not just a summary paragraph, but a structured read — status, three
// scores, concrete strengths and concerns, a note on how consistent the
// referees' accounts are with each other, suggested follow-up questions for
// a TA to ask, and a one-line takeaway per referee. Used in three places
// that all share this one generator so they never drift apart: page 1 of
// the PDF report (reports/reference-check-report-pdf.ts), the dashboard
// card (reference-check-card.tsx, via the persisted `aiInsights` field),
// and Penny's chat context (ai/build-context.ts folds `aiInsights` into
// `refCheckDetails` once persisted) — this is the "wire the module
// end-to-end" piece: one generator, one shape, read everywhere.
//
// Candidate and referee names ARE sent to the model (a deliberate,
// explicit choice for this feature — see SETUP.md §7): a reference check is
// about a specific person, and naming them produces a materially more
// useful, more specific analysis than "Referee 1"/"the candidate". This is
// a narrower exception than Penny's general context, which already sends
// candidate names for the same reason (build-context.ts) but not full
// free-text reference answers.
//
// Reuses the same provider/model setup as the "Penny" chat assistant
// (./providers.ts), defaulting to the same provider the chat UI defaults to
// (Groq's Llama 3.3 — see ai-assistant-launcher.tsx). If the AI call fails
// for any reason (missing API key, rate limit, model unavailable) this
// returns `null` rather than throwing — the caller degrades gracefully
// (report section omitted, card shows a "generate" prompt instead of
// results) rather than blocking anything.
import { generateObject } from "ai";
import { z } from "zod";
import { getProvider } from "./providers";
import type { ReferenceCheckReportData } from "@/lib/reports/reference-check-report";
import type { ReferenceCheckAiInsights, RefereeStatus } from "@/types";

export const referenceCheckAiInsightsSchema = z.object({
  overallStatus: z.enum([
    "Strong Recommend",
    "Recommend",
    "Recommend with Reservations",
    "Do Not Recommend",
    "Insufficient Data",
  ]),
  summary: z
    .string()
    .describe(
      "2-4 sentence plain-English summary of what the referee(s) said, written for a hiring manager deciding on an offer. Refer to the candidate by name."
    ),
  recommendationScore: z
    .number()
    .min(1)
    .max(5)
    .describe("How strongly the referee feedback supports hiring this candidate: 1 = do not hire, 5 = strongly recommend."),
  overallScore: z
    .number()
    .min(1)
    .max(5)
    .describe("Blended quality signal across technical ability, reliability, and teamwork, 1-5."),
  confidenceScore: z
    .number()
    .min(0)
    .max(100)
    .describe(
      "Confidence in this assessment, 0-100% — lower when only one referee has responded, or when answers were thin/vague."
    ),
  keyStrengths: z
    .array(z.string())
    .describe(
      "1-4 concrete positives grounded in what the referee(s) actually said (e.g. a specific strength example they gave). Empty array if nothing concrete was said."
    ),
  areasOfConcern: z
    .array(z.string())
    .describe(
      "0-4 concrete concerns or gaps worth a hiring manager probing further — thin answers, hesitation, a stated development area, a low sub-score. Empty array if there are none."
    ),
  consistencyNotes: z
    .string()
    .describe(
      "1-2 sentences on how well the referees' accounts agree with each other (scores, tone, specific claims). If only one referee has responded so far, say so plainly and leave deeper comparison for when another comes in."
    ),
  suggestedFollowUps: z
    .array(z.string())
    .describe(
      "0-3 specific questions a TA could ask in a follow-up call to resolve a gap, a vague answer, or a concern raised above. Empty array if the responses are thorough enough that none are needed."
    ),
  refereeTakeaways: z
    .array(z.string())
    .describe(
      "One-sentence headline per referee's overall take, in the same order as the referees were listed above. Empty string for any referee who has not responded."
    ),
});

type GeneratedInsights = z.infer<typeof referenceCheckAiInsightsSchema>;

// Deliberately named/PII-inclusive — see the module comment above for why
// this differs from the earlier, more conservative version of this function.
function describeReferee(num: number, r: RefereeStatus): string {
  if (!r.responded) return `Referee ${num} (${r.name || "not provided"}): did not respond.`;
  // Historical records only have the old two-field strengthExample/
  // developmentAreas pair; the redesigned form writes one merged field.
  const strengthsAndDevelopment =
    r.strengthsAndDevelopment?.trim() ||
    [r.strengthExample?.trim(), r.developmentAreas?.trim()].filter(Boolean).join("\n") ||
    "not provided";
  return [
    `Referee ${num}: ${r.name || "not provided"} (${r.email || "no email on file"})`,
    `- Relationship to candidate: ${r.relationship ?? "not stated"}${r.directlySupervised ? " (directly supervised the candidate)" : ""}`,
    `- How long they've known the candidate: ${r.durationKnown ?? "not stated"}`,
    `- Technical score: ${r.techScore ?? "—"}/5`,
    `- Reliability score: ${r.reliabilityScore ?? "—"}/5`,
    `- Teamwork score: ${r.teamworkScore ?? "—"}/5`,
    `- Problem solving score: ${r.problemSolvingScore ?? "—"}/5`,
    `- Adaptability score: ${r.adaptabilityScore ?? "—"}/5`,
    `- Would rehire: ${r.wouldRehire ?? "not stated"}`,
    `- Strengths and areas for development: ${strengthsAndDevelopment}`,
    `- How they handle pressure, conflict, or a tough decision: ${r.conflictExample?.trim() || "not provided"}`,
    `- Honesty/integrity concerns: ${r.honestyConcerns ?? "not stated"}`,
    ...(r.complianceIncidents ? [`- Compliance incidents: ${r.complianceIncidents}`] : []),
    ...(r.licenseStanding ? [`- License/registration standing: ${r.licenseStanding}`] : []),
    `- Overall recommendation score: ${r.overallRecommendScore ?? "—"}/5`,
    `- Additional notes: ${r.notes?.trim() || "none"}`,
  ].join("\n");
}

export async function generateReferenceCheckInsights(
  data: ReferenceCheckReportData
): Promise<ReferenceCheckAiInsights | null> {
  // Nothing to analyze yet — callers already gate on this, but stay
  // defensive since this function is now called from multiple places.
  if (data.referees.every((r) => !r.responded)) return null;

  const prompt = [
    `Candidate: ${data.candidateName || "not specified"}`,
    `Role: ${data.roleTitle || "not specified"}`,
    "",
    data.referees.map((r, i) => describeReferee(i + 1, r)).join("\n\n"),
    "",
    "Analyze the reference check responses above and produce a hiring-manager-facing assessment. " +
      "Ground every claim in what a referee actually said — never invent detail, and never attribute a " +
      "statement to a referee who didn't respond.",
  ].join("\n");

  try {
    const provider = getProvider("llama");
    const model = provider.getModel();
    const { object } = await generateObject({
      model,
      schema: referenceCheckAiInsightsSchema,
      system:
        "You are assisting a healthcare recruitment team by analyzing reference check responses. Be concise, " +
        "balanced, and specific — ground every claim in what the referee(s) actually said rather than inventing " +
        "detail. If a referee didn't respond, factor that into your confidence score and leave their entry in " +
        "refereeTakeaways as an empty string. Use the candidate's and referees' names naturally rather than generic labels.",
      prompt,
    });

    return finalizeInsights(object, data);
  } catch (err) {
    console.error("[ai/reference-check-summary] generation failed:", err);
    return null;
  }
}

function finalizeInsights(object: GeneratedInsights, data: ReferenceCheckReportData): ReferenceCheckAiInsights {
  // Guardrail independent of the model's own judgment: until every contacted
  // referee has responded, cap how confident this report is allowed to claim
  // to be, regardless of what the model itself returned.
  const respondedCount = data.referees.filter((r) => r.responded).length;
  const confidenceScore =
    respondedCount === data.referees.length ? object.confidenceScore : Math.min(object.confidenceScore, 60);

  return {
    ...object,
    confidenceScore,
    refereeTakeaways: data.referees.map((r, i) => (r.responded ? object.refereeTakeaways[i] ?? "" : "")),
    generatedAt: new Date().toISOString(),
  };
}
