// Generates a short AI-written analysis of a reference check for page 1 of
// the PDF report (see reports/reference-check-report-pdf.ts): an overall
// status, a plain-English summary, and three scores. This is a supplement
// to the human "outcome" dropdown TAs already set on the dashboard, never a
// replacement — the PDF section says so.
//
// Reuses the same provider/model setup as the "Penny" chat assistant
// (./providers.ts), defaulting to the same provider the chat UI defaults to
// (Groq's Llama 3.3 — see ai-assistant-launcher.tsx). If the AI call fails
// for any reason (missing API key, rate limit, model unavailable) this
// returns `null` rather than throwing — the report still generates, just
// without this section, the same way a missing logo file degrades
// gracefully rather than blocking the PDF.
import { generateObject } from "ai";
import { z } from "zod";
import { getProvider } from "./providers";
import type { ReferenceCheckReportData } from "@/lib/reports/reference-check-report";
import type { RefereeStatus } from "@/types";

export const referenceCheckAiSummarySchema = z.object({
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
      "2-4 sentence plain-English summary of what the referee(s) said, written for a hiring manager deciding on an offer."
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
});

export type ReferenceCheckAiSummary = z.infer<typeof referenceCheckAiSummarySchema>;

// Deliberately omits the candidate's and referees' names/emails/phone
// numbers — SETUP.md §7 documents that no PII reaches an AI provider from
// this app, and a reference check's free-text answers can already be
// identifying enough on their own without adding real names on top.
function describeReferee(num: 1 | 2, r: RefereeStatus): string {
  if (!r.responded) return `Referee ${num}: did not respond.`;
  return [
    `Referee ${num}:`,
    `- Relationship to candidate: ${r.relationship ?? "not stated"}`,
    `- How long they've known the candidate: ${r.durationKnown ?? "not stated"}`,
    `- Technical score: ${r.techScore ?? "—"}/5`,
    `- Reliability score: ${r.reliabilityScore ?? "—"}/5`,
    `- Teamwork score: ${r.teamworkScore ?? "—"}/5`,
    `- Would rehire: ${r.wouldRehire ?? "not stated"}`,
    `- Strength example: ${r.strengthExample?.trim() || "not provided"}`,
    `- Areas for development: ${r.developmentAreas?.trim() || "not provided"}`,
    `- Additional notes: ${r.notes?.trim() || "none"}`,
  ].join("\n");
}

export async function generateReferenceCheckSummary(
  data: ReferenceCheckReportData
): Promise<ReferenceCheckAiSummary | null> {
  // Nothing to analyze yet — the route already gates on this, but stay
  // defensive since this function could get called from elsewhere later.
  if (!data.referee1.responded && !data.referee2.responded) return null;

  const prompt = [
    `Role: ${data.roleTitle || "not specified"}`,
    "",
    describeReferee(1, data.referee1),
    "",
    describeReferee(2, data.referee2),
    "",
    "Analyze the reference check responses above and produce a hiring-manager-facing assessment.",
  ].join("\n");

  try {
    const provider = getProvider("llama");
    const model = provider.getModel();
    const { object } = await generateObject({
      model,
      schema: referenceCheckAiSummarySchema,
      system:
        "You are assisting a healthcare recruitment team by analyzing reference check responses. Be concise, " +
        "balanced, and specific — ground your summary in what the referee(s) actually said rather than inventing " +
        "detail. If a referee didn't respond, factor that into your confidence score.",
      prompt,
    });

    // Guardrail independent of the model's own judgment: with only one of
    // two referees in, cap how confident this report is allowed to claim to
    // be, regardless of what the model itself returned.
    const respondedCount = [data.referee1.responded, data.referee2.responded].filter(Boolean).length;
    const confidenceScore = respondedCount < 2 ? Math.min(object.confidenceScore, 60) : object.confidenceScore;

    return { ...object, confidenceScore };
  } catch (err) {
    console.error("[ai/reference-check-summary] generation failed:", err);
    return null;
  }
}
