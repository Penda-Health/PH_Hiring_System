// Generates the AI "intelligence and insights layer" for a work trial —
// mirrors reference-check-summary.ts's shape and error-handling exactly (see
// that file's header comment for the fuller rationale), adapted for a single
// evaluator's scores + written feedback instead of multiple referees'
// accounts. Used from the work trial review dialog (ManualReviewDialog in
// work-trial-card.tsx, via the persisted `aiInsights` field) so a TA reviewing
// a completed trial gets a synthesized read rather than just three raw
// numbers.
//
// Candidate and role names ARE sent to the model, same deliberate choice (and
// same justification) as reference-check-summary.ts.
//
// Reuses the same provider/model setup as Penny and the reference-check
// generator (./providers.ts). If the AI call fails for any reason this
// returns `null` rather than throwing — the caller degrades gracefully (the
// dialog shows a "generate" prompt instead of results) rather than blocking
// the review flow.
import { generateObject } from "ai";
import { z } from "zod";
import { getProvider } from "./providers";
import type { WorkTrialReportData } from "@/lib/reports/work-trial-report";
import type { WorkTrialAiInsights } from "@/types";

export const workTrialAiInsightsSchema = z.object({
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
      "2-4 sentence plain-English summary of how the candidate did, written for a hiring manager deciding whether to advance them. Refer to the candidate by name."
    ),
  confidenceScore: z
    .number()
    .min(0)
    .max(100)
    .describe(
      "Confidence in this assessment, 0-100% — lower when the written feedback is thin/vague or the submission was an uploaded paper form with little detail beyond a single recommendation line."
    ),
  keyStrengths: z
    .array(z.string())
    .describe(
      "1-4 concrete positives grounded in the scores and comments actually given (e.g. a specific example from the strengths/comments fields). Empty array if nothing concrete was said."
    ),
  areasOfConcern: z
    .array(z.string())
    .describe(
      "0-4 concrete concerns or gaps worth a hiring manager probing further — a low sub-score, a stated development area, hesitant or thin comments. Empty array if there are none."
    ),
  alignmentNotes: z
    .string()
    .describe(
      "1-2 sentences on whether the written comments line up with the numeric scores (e.g. a high score paired with lukewarm-sounding notes, or vice versa). If there's no written feedback to compare against (an uploaded-form submission with only an overall recommendation line), say so plainly."
    ),
  suggestedFollowUps: z
    .array(z.string())
    .describe(
      "0-3 specific things a hiring manager could ask about or verify before finalizing an offer decision, to resolve a gap, a vague comment, or a concern raised above. Empty array if the feedback is thorough enough that none are needed."
    ),
});

type GeneratedInsights = z.infer<typeof workTrialAiInsightsSchema>;

function formatScore(score: number | null): string {
  return score === null ? "not scored" : `${score / 10}/10`;
}

function describeWorkTrial(data: WorkTrialReportData): string {
  const lines = [
    `Candidate: ${data.candidateName || "not specified"}`,
    `Role: ${data.roleTitle || "not specified"}${data.specialty ? ` (${data.specialty})` : ""}`,
    `Branch: ${data.branchName || "not specified"}`,
    `Result: ${data.total ?? "—"}/100 — ${data.passFail}`,
    "",
    `Culture Fit (40%): ${formatScore(data.scoreCulture)}`,
    `Patient Experience (40%): ${formatScore(data.scorePatient)}`,
    `Technical Fit (20%): ${formatScore(data.scoreTechnical)}`,
  ];

  if (data.submissionMethod === "Uploaded") {
    // Uploaded paper forms skip the six detailed comment fields — only a
    // single overall recommendation line exists for these.
    lines.push("", `Overall recommendation (uploaded form, no detailed comments): ${data.overallRecommendation?.trim() || "not provided"}`);
  } else {
    lines.push("");
    if (data.commentCulture?.trim()) lines.push(`Culture Fit comments: ${data.commentCulture.trim()}`);
    if (data.commentPatient?.trim()) lines.push(`Patient Experience comments: ${data.commentPatient.trim()}`);
    if (data.commentTechnical?.trim()) lines.push(`Technical Fit comments: ${data.commentTechnical.trim()}`);
    if (data.strengths?.trim()) lines.push(`Strengths: ${data.strengths.trim()}`);
    if (data.areasOfDevelopment?.trim()) lines.push(`Areas of development: ${data.areasOfDevelopment.trim()}`);
    if (data.overallRecommendation?.trim()) lines.push(`Overall recommendation: ${data.overallRecommendation.trim()}`);
  }

  return lines.join("\n");
}

export async function generateWorkTrialInsights(data: WorkTrialReportData): Promise<WorkTrialAiInsights | null> {
  // Nothing to analyze yet — callers already gate on this, but stay
  // defensive since this function may end up called from multiple places.
  if (data.total === null || data.passFail === "Pending") return null;

  const prompt = [
    describeWorkTrial(data),
    "",
    "Analyze the work trial scores and feedback above and produce a hiring-manager-facing assessment. " +
      "Ground every claim in what was actually scored or written — never invent detail.",
  ].join("\n");

  try {
    const provider = getProvider("llama");
    const model = provider.getModel();
    const { object } = await generateObject({
      model,
      schema: workTrialAiInsightsSchema,
      system:
        "You are assisting a healthcare recruitment team by analyzing work trial results. Be concise, balanced, " +
        "and specific — ground every claim in the scores or comments actually given rather than inventing detail. " +
        "Use the candidate's name naturally rather than a generic label.",
      prompt,
    });

    return finalizeInsights(object);
  } catch (err) {
    console.error("[ai/work-trial-summary] generation failed:", err);
    return null;
  }
}

function finalizeInsights(object: GeneratedInsights): WorkTrialAiInsights {
  return {
    ...object,
    generatedAt: new Date().toISOString(),
  };
}
