// Renders a single reference check into a Penda-branded PDF: a cover with
// candidate/role/status, then one section per referee (2-4 of them). Unlike
// the work-trial report there's no "uploaded source document" case to merge
// in — every reference check is structured data collected through /referee —
// so there's just the one layout, and it degrades gracefully when not every
// referee has responded yet (an unresponded referee's section says so
// plainly rather than showing blanks).
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import fs from "fs";
import path from "path";
import type { ReferenceCheckReportData } from "./reference-check-report";
import type { RefereeStatus } from "@/types";
import type { ReferenceCheckAiInsights } from "@/types";

const PAGE_W = 595.28; // A4, points
const PAGE_H = 841.89;
const MARGIN = 50;
const CONTENT_W = PAGE_W - MARGIN * 2;

// Same palette as work-trial-report-pdf.ts, pulled from tailwind.config.ts's
// `penda` palette so every generated report matches the app's own look.
const BLUE = rgb(0x1e / 255, 0x55 / 255, 0xff / 255);
const BLUE_DARK = rgb(0x11 / 255, 0x35 / 255, 0xb8 / 255);
const CHARCOAL = rgb(0x34 / 255, 0x35 / 255, 0x39 / 255);
const SAND = rgb(0xfb / 255, 0xf4 / 255, 0xe4 / 255);
const GREY = rgb(0.42, 0.43, 0.46);
const WHITE = rgb(1, 1, 1);
const GREEN = rgb(0.11, 0.5, 0.24);
const RED = rgb(0.83, 0.19, 0.19);
const AMBER = rgb(0.72, 0.5, 0.09);

const LOGO_PATH = path.join(process.cwd(), "public", "assets", "logo.png");

type Ctx = {
  doc: PDFDocument;
  regular: PDFFont;
  bold: PDFFont;
  logoImage: Awaited<ReturnType<PDFDocument["embedPng"]>> | null;
  page: PDFPage;
  y: number;
  pageNum: number;
};

// AI-generated summaries and free-typed referee answers/names routinely
// contain typographic punctuation — most commonly a non-breaking hyphen
// ("problem‑solving") — that falls outside the WinAnsi encoding pdf-lib's
// standard Helvetica font uses. Measuring or drawing one throws and takes
// down the *entire* report (see StandardFontEmbedder.encodeUnicodeCodePoint),
// including referees who did answer, so every character that reaches
// wrapText()/drawSectionHeading() is normalized through here first.
// WIN_ANSI_EXTRA mirrors the handful of codepoints above U+00FF that
// @pdf-lib/standard-fonts' win1252 table *does* support (smart quotes, en/em
// dash, ellipsis, bullet, €, ™, …) — anything else outside 0x20-0x7E/
// 0xA0-0xFF is dropped rather than crashing the render.
const PDF_CHAR_REPLACEMENTS: Record<string, string> = {
  "‐": "-", // hyphen
  "‑": "-", // non-breaking hyphen (the one AI summaries actually produce)
  "‒": "-", // figure dash
  "―": "-", // horizontal bar
  "−": "-", // minus sign
  "​": "", // zero-width space
  "‌": "",
  "‍": "",
  "﻿": "",
  "\t": " ",
  " ": " ", // narrow no-break space
  " ": " ",
  " ": " ",
  " ": " ",
  " ": " ",
  " ": " ",
  " ": " ",
  " ": " ",
  " ": " ",
  " ": " ",
  " ": " ",
  " ": " ",
};
const WIN_ANSI_EXTRA = new Set([
  0x152, 0x153, 0x160, 0x161, 0x178, 0x17d, 0x17e, 0x192, 0x2c6, 0x2dc, 0x2013, 0x2014, 0x2018, 0x2019, 0x201a, 0x201c,
  0x201d, 0x201e, 0x2020, 0x2021, 0x2022, 0x2026, 0x2030, 0x2039, 0x203a, 0x20ac, 0x2122,
]);

function sanitizeForPdf(text: string): string {
  let out = "";
  for (const ch of text) {
    if (ch === "\n") {
      out += ch;
      continue;
    }
    const replacement = PDF_CHAR_REPLACEMENTS[ch];
    if (replacement !== undefined) {
      out += replacement;
      continue;
    }
    const code = ch.codePointAt(0) ?? 0;
    if ((code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff) || WIN_ANSI_EXTRA.has(code)) {
      out += ch;
    }
    // Anything else (emoji, exotic symbols, non-Latin scripts) is dropped —
    // silently losing an unsupported character beats 500ing the whole report.
  }
  return out;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraphLine of sanitizeForPdf(text).split("\n")) {
    const words = paragraphLine.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
        lines.push(current);
        current = word;
      } else {
        current = candidate;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

function drawFooter(ctx: Ctx) {
  const label = `Penda Health Recruitment System · Generated ${new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })}`;
  ctx.page.drawText(label, { x: MARGIN, y: 28, size: 8, font: ctx.regular, color: GREY });
  const pageLabel = `Page ${ctx.pageNum}`;
  const w = ctx.regular.widthOfTextAtSize(pageLabel, 8);
  ctx.page.drawText(pageLabel, { x: PAGE_W - MARGIN - w, y: 28, size: 8, font: ctx.regular, color: GREY });
}

function newPage(ctx: Ctx) {
  drawFooter(ctx);
  ctx.page = ctx.doc.addPage([PAGE_W, PAGE_H]);
  ctx.pageNum += 1;
  ctx.y = PAGE_H - MARGIN;
}

function ensureSpace(ctx: Ctx, needed: number) {
  if (ctx.y - needed < MARGIN + 20) newPage(ctx);
}

function drawHeader(ctx: Ctx, title: string) {
  const barHeight = 64;
  ctx.page.drawRectangle({ x: 0, y: PAGE_H - barHeight, width: PAGE_W, height: barHeight, color: SAND });
  if (ctx.logoImage) {
    const logoH = 26;
    const logoW = (ctx.logoImage.width / ctx.logoImage.height) * logoH;
    ctx.page.drawImage(ctx.logoImage, {
      x: MARGIN,
      y: PAGE_H - barHeight / 2 - logoH / 2,
      width: logoW,
      height: logoH,
    });
  }
  const eyebrow = "TALENT ACQUISITION · REFERENCE CHECK REPORT";
  const eyebrowW = ctx.bold.widthOfTextAtSize(eyebrow, 8.5);
  ctx.page.drawText(eyebrow, {
    x: PAGE_W - MARGIN - eyebrowW,
    y: PAGE_H - barHeight / 2 + 4,
    size: 8.5,
    font: ctx.bold,
    color: BLUE_DARK,
  });
  const titleW = ctx.bold.widthOfTextAtSize(title, 11);
  ctx.page.drawText(title, {
    x: PAGE_W - MARGIN - titleW,
    y: PAGE_H - barHeight / 2 - 10,
    size: 11,
    font: ctx.regular,
    color: CHARCOAL,
  });
  ctx.y = PAGE_H - barHeight - 28;
}

// Thin rule drawn after a top-level section (AI analysis, each referee) so
// the boundary stays legible now that sections flow continuously instead of
// each getting a forced page of its own.
function drawDivider(ctx: Ctx) {
  ensureSpace(ctx, 24);
  ctx.y -= 4;
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.y },
    end: { x: MARGIN + CONTENT_W, y: ctx.y },
    thickness: 0.75,
    color: rgb(0.87, 0.87, 0.89),
  });
  ctx.y -= 20;
}

function drawSectionHeading(ctx: Ctx, text: string) {
  ensureSpace(ctx, 26);
  ctx.page.drawRectangle({ x: MARGIN, y: ctx.y - 12, width: 3, height: 14, color: BLUE });
  // Unlike every other heading here (hardcoded English labels), this one
  // sometimes carries a referee's free-typed/Google-supplied name — route it
  // through the same sanitizer as body text so an unusual character in a
  // name can't crash the render either.
  ctx.page.drawText(sanitizeForPdf(text), { x: MARGIN + 10, y: ctx.y - 10.5, size: 11.5, font: ctx.bold, color: CHARCOAL });
  ctx.y -= 26;
}

// Two-column label/value grid, e.g. candidate metadata or a referee's scores.
function drawFactGrid(ctx: Ctx, facts: { label: string; value: string }[]) {
  const colW = CONTENT_W / 2;
  const rowH = 30;
  let col = 0;
  let rowY = ctx.y;
  for (const fact of facts) {
    if (col === 0) {
      ensureSpace(ctx, rowH);
      rowY = ctx.y;
    }
    const x = MARGIN + col * colW;
    ctx.page.drawText(fact.label.toUpperCase(), { x, y: rowY - 10, size: 7.5, font: ctx.bold, color: GREY });
    const lines = wrapText(fact.value || "—", ctx.regular, 10.5, colW - 12);
    ctx.page.drawText(lines[0] ?? "—", { x, y: rowY - 24, size: 10.5, font: ctx.regular, color: CHARCOAL });
    if (col === 1) {
      ctx.y = rowY - rowH;
    }
    col = col === 0 ? 1 : 0;
  }
  if (col === 1) ctx.y = rowY - rowH; // odd number of facts — close the row
  ctx.y -= 6;
}

function drawParagraphSection(ctx: Ctx, heading: string, text: string | undefined, placeholder = "Not provided.") {
  drawSectionHeading(ctx, heading);
  const body = text && text.trim() ? text.trim() : placeholder;
  const isPlaceholder = body === placeholder;
  const lines = wrapText(body, ctx.regular, 10, CONTENT_W);
  const lineH = 14;
  for (const line of lines) {
    ensureSpace(ctx, lineH);
    ctx.page.drawText(line, {
      x: MARGIN,
      y: ctx.y - 10,
      size: 10,
      font: ctx.regular,
      color: isPlaceholder ? GREY : CHARCOAL,
    });
    ctx.y -= lineH;
  }
  ctx.y -= 12;
}

// Bulleted list section (key strengths, areas of concern, follow-up
// questions) — same heading treatment as drawParagraphSection but one
// wrapped, hanging-indent bullet per entry instead of a single body of text.
// Omits the whole section (heading included) when there's nothing to show,
// since an empty "Areas of concern" heading would read as "we checked and
// found nothing" when really the model just had nothing to add either way —
// callers that want an explicit empty-state pass a placeholder-only call.
function drawBulletListSection(ctx: Ctx, heading: string, items: string[]) {
  if (items.length === 0) return;
  drawSectionHeading(ctx, heading);
  const bulletIndent = 14;
  const lineH = 14;
  for (const item of items) {
    const lines = wrapText(item, ctx.regular, 10, CONTENT_W - bulletIndent);
    for (const [i, line] of Array.from(lines.entries())) {
      ensureSpace(ctx, lineH);
      if (i === 0) {
        ctx.page.drawText("•", { x: MARGIN, y: ctx.y - 10, size: 10, font: ctx.bold, color: BLUE });
      }
      ctx.page.drawText(line, { x: MARGIN + bulletIndent, y: ctx.y - 10, size: 10, font: ctx.regular, color: CHARCOAL });
      ctx.y -= lineH;
    }
  }
  ctx.y -= 12;
}

// Reference check "created" / referee "responded" timestamps are written to
// Airtable as date-only (see rc.createdAt / respondedAt handling in
// mappers.ts, which slices to YYYY-MM-DD) — there's no real time-of-day
// captured, so showing one (e.g. "17 Aug 2026, 00:00") would just be noise
// that looks like broken data. Format as a plain date instead.
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

// Referee employment-date fields are real ISO dates (YYYY-MM-DD) from Sept
// 2026 onward, matching the live Airtable `date` column — see monthToIsoDate
// in src/app/referee/page.tsx. Older records may still hold free text from
// an earlier form generation ("Mar 2021", garbled input, etc.) — pass those
// through unchanged rather than mangling them.
function fmtEmploymentMonth(value: string | undefined): string | undefined {
  if (!value) return value;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

function scoreLabel(v: number | undefined): string {
  return v === undefined || v === null ? "—" : `${v}/5`;
}

async function buildCtx(doc: PDFDocument): Promise<Ctx> {
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let logoImage: Ctx["logoImage"] = null;
  try {
    const logoBytes = fs.readFileSync(LOGO_PATH);
    logoImage = await doc.embedPng(logoBytes);
  } catch {
    logoImage = null; // branding degrades gracefully — report still generates without the logo
  }
  const page = doc.addPage([PAGE_W, PAGE_H]);
  return { doc, regular, bold, logoImage, page, y: PAGE_H - MARGIN, pageNum: 1 };
}

function drawStatusBanner(ctx: Ctx, data: ReferenceCheckReportData) {
  const bannerH = 32;
  ensureSpace(ctx, bannerH + 12);
  const outcomeColor =
    data.outcome === "Negative" ? RED : data.outcome === "Positive" ? GREEN : data.outcome === "Mixed" ? BLUE_DARK : GREY;
  ctx.page.drawRectangle({ x: MARGIN, y: ctx.y - bannerH, width: CONTENT_W, height: bannerH, color: CHARCOAL });
  ctx.page.drawText("STATUS", { x: MARGIN + 8, y: ctx.y - bannerH / 2 - 3, size: 8.5, font: ctx.bold, color: WHITE });
  ctx.page.drawText(data.status, { x: MARGIN + 70, y: ctx.y - bannerH / 2 - 4, size: 11, font: ctx.bold, color: WHITE });
  const outcomeText = data.outcome.toUpperCase();
  const outcomeW = ctx.bold.widthOfTextAtSize(outcomeText, 11);
  ctx.page.drawRectangle({
    x: MARGIN + CONTENT_W - outcomeW - 24,
    y: ctx.y - bannerH / 2 - 9,
    width: outcomeW + 16,
    height: 18,
    color: outcomeColor,
  });
  ctx.page.drawText(outcomeText, {
    x: MARGIN + CONTENT_W - outcomeW - 16,
    y: ctx.y - bannerH / 2 - 4,
    size: 11,
    font: ctx.bold,
    color: WHITE,
  });
  ctx.y -= bannerH + 24;
}

// AI-generated intelligence layer for the reference check, drawn on page 1
// alongside the human-set status banner above it. Deliberately kept visually
// distinct (its own heading + a disclaimer line) so it reads as a
// supplementary signal, not the official TA-set outcome. Goes well beyond a
// single summary paragraph: scores, concrete strengths/concerns, a
// cross-referee consistency note, suggested follow-ups, and a one-line
// takeaway per referee — the same structured object shown on the dashboard
// card and available to Penny in chat (see ai/reference-check-summary.ts).
function drawAiSummarySection(ctx: Ctx, insights: ReferenceCheckAiInsights) {
  drawSectionHeading(ctx, "AI Analysis");

  ensureSpace(ctx, 14);
  ctx.page.drawText(
    "Generated automatically from referee responses — a supplement to human judgment, not a replacement.",
    { x: MARGIN, y: ctx.y - 10, size: 8, font: ctx.regular, color: GREY }
  );
  ctx.y -= 22;

  drawFactGrid(ctx, [
    { label: "Overall status", value: insights.overallStatus },
    { label: "Confidence", value: `${Math.round(insights.confidenceScore)}%` },
    { label: "Recommendation score", value: `${insights.recommendationScore}/5` },
    { label: "Overall score", value: `${insights.overallScore}/5` },
  ]);

  drawParagraphSection(ctx, "Summary", insights.summary);
  drawBulletListSection(ctx, "Key strengths", insights.keyStrengths);
  drawBulletListSection(ctx, "Areas of concern", insights.areasOfConcern);
  if (insights.consistencyNotes.trim()) {
    drawParagraphSection(ctx, "Consistency between referees", insights.consistencyNotes);
  }
  drawBulletListSection(ctx, "Suggested follow-up questions", insights.suggestedFollowUps);

  const takeaways = insights.refereeTakeaways
    .map((t, i) => (t.trim() ? `Referee ${i + 1}: ${t.trim()}` : null))
    .filter((t): t is string => t !== null);
  if (takeaways.length > 0) {
    drawSectionHeading(ctx, "Referee takeaways");
    for (const t of takeaways) {
      const lines = wrapText(t, ctx.regular, 10, CONTENT_W);
      for (const line of lines) {
        ensureSpace(ctx, 14);
        ctx.page.drawText(line, { x: MARGIN, y: ctx.y - 10, size: 10, font: ctx.regular, color: CHARCOAL });
        ctx.y -= 14;
      }
    }
    ctx.y -= 12;
  }
}

// Colors for the overall recommend-hire badge — bucketed the same way for
// both the current 4-option scale and a legacy 1-5 overallRecommendScore
// (see recommendHireFromLegacyScore) so old and new reports render a
// comparable badge.
function recommendHireColor(label: string) {
  if (label === "Strongly Recommend" || label === "Recommend") return GREEN;
  if (label === "Recommend with Reservations") return AMBER;
  if (label === "Do Not Recommend") return RED;
  return GREY;
}

function recommendHireFromLegacyScore(score: number): string {
  if (score >= 5) return "Strongly Recommend";
  if (score >= 4) return "Recommend";
  if (score >= 2) return "Recommend with Reservations";
  return "Do Not Recommend";
}

function drawRecommendBadge(ctx: Ctx, label: string) {
  const rowH = 26;
  ensureSpace(ctx, rowH + 12);
  const text = label.toUpperCase();
  const textSize = 10;
  const textW = ctx.bold.widthOfTextAtSize(text, textSize);
  const badgeW = textW + 24;
  const badgeH = 20;
  const labelY = ctx.y - rowH / 2 - 3;
  ctx.page.drawText("OVERALL RECOMMENDATION", { x: MARGIN, y: labelY, size: 8.5, font: ctx.bold, color: GREY });
  const badgeX = MARGIN + 170;
  ctx.page.drawRectangle({
    x: badgeX,
    y: ctx.y - rowH / 2 - badgeH / 2,
    width: badgeW,
    height: badgeH,
    color: recommendHireColor(label),
  });
  ctx.page.drawText(text, { x: badgeX + 12, y: ctx.y - rowH / 2 - 4, size: textSize, font: ctx.bold, color: WHITE });
  ctx.y -= rowH + 10;
}

function drawRefereeSection(ctx: Ctx, num: number, referee: RefereeStatus) {
  ensureSpace(ctx, 40);
  drawSectionHeading(ctx, `Referee ${num}: ${referee.name || "—"}`);

  if (!referee.responded) {
    const boxH = 32;
    ensureSpace(ctx, boxH + 12);
    ctx.page.drawRectangle({ x: MARGIN, y: ctx.y - boxH, width: CONTENT_W, height: boxH, color: rgb(0.97, 0.97, 0.98) });
    ctx.page.drawText("This referee has not responded yet.", {
      x: MARGIN + 12,
      y: ctx.y - boxH / 2 - 4,
      size: 10,
      font: ctx.regular,
      color: GREY,
    });
    ctx.y -= boxH + 16;
    return;
  }

  const verificationLabel = referee.googleVerified
    ? `Verified via Google (${referee.googleVerifiedEmail || referee.email})`
    : referee.googleVerifiedOverrideBy
      ? `Manually verified by ${referee.googleVerifiedOverrideBy}`
      : "Not verified";

  const employmentPeriod =
    referee.employmentFrom || referee.employmentTo || referee.stillEmployed
      ? `${fmtEmploymentMonth(referee.employmentFrom) ?? "—"} to ${referee.stillEmployed ? "present" : fmtEmploymentMonth(referee.employmentTo) ?? "—"}`
      : "—";

  // `reportingRelationship` replaces the old standalone directlySupervised
  // yes/no question — historical records only have the latter.
  const reportingRelationship =
    referee.reportingRelationship ?? (referee.directlySupervised ? "Reported directly to me" : undefined);

  drawFactGrid(ctx, [
    { label: "Email", value: referee.email },
    { label: "Phone", value: referee.phone },
    { label: "Responded", value: fmtDate(referee.respondedAt) },
    { label: "Identity verification", value: verificationLabel },
  ]);

  drawFactGrid(ctx, [
    {
      label: "Relationship to candidate",
      value: referee.relationship
        ? `${referee.relationship}${reportingRelationship ? ` (${reportingRelationship})` : ""}`
        : "—",
    },
    { label: "Referee's organization", value: referee.refereeOrganization ?? "—" },
    { label: "How long they've known the candidate", value: referee.durationKnown ?? "—" },
    { label: "How often they interacted", value: referee.interactionFrequency ?? "—" },
    { label: "Candidate's job title (as recalled)", value: referee.jobTitleRecalled ?? "—" },
    { label: "Employment period", value: employmentPeriod },
    { label: "Who the candidate reported to", value: referee.reportedTo ?? "—" },
    { label: "Reason for leaving", value: referee.leavingReason ?? "—" },
  ]);

  drawParagraphSection(ctx, "Main responsibilities", referee.mainResponsibilities);

  // Execution/teamwork/communication is the current form's core performance
  // block, each rating paired with a supporting example. Historical records
  // only have the old tech/reliability scores and never collected an
  // example for them — those fall back onto the execution rating.
  const executionScore = referee.executionScore ?? referee.techScore ?? referee.reliabilityScore;
  drawParagraphSection(ctx, `Execution & performance — ${scoreLabel(executionScore)}`, referee.executionExample);
  drawParagraphSection(ctx, `Teamwork & collaboration — ${scoreLabel(referee.teamworkScore)}`, referee.teamworkExample);
  drawParagraphSection(ctx, `Communication — ${scoreLabel(referee.communicationScore)}`, referee.communicationExample);
  if (referee.problemSolvingScore !== undefined || referee.adaptabilityScore !== undefined) {
    drawFactGrid(ctx, [
      { label: "Problem solving score (legacy field)", value: scoreLabel(referee.problemSolvingScore) },
      { label: "Adaptability score (legacy field)", value: scoreLabel(referee.adaptabilityScore) },
    ]);
  }

  // Historical records only have the old two-field strengthExample/
  // developmentAreas pair, or the previous redesign's merged field.
  const topStrengths =
    referee.topStrengths?.trim() ||
    referee.strengthExample?.trim() ||
    referee.strengthsAndDevelopment?.trim() ||
    undefined;
  const coachingArea = referee.coachingArea?.trim() || referee.developmentAreas?.trim() || undefined;
  drawParagraphSection(ctx, "Three greatest strengths", topStrengths);
  drawParagraphSection(ctx, "One area for coaching", coachingArea);

  drawFactGrid(ctx, [
    {
      label: "Would rehire",
      value: referee.wouldRehire
        ? `${referee.wouldRehire}${referee.wouldRehireExplanation ? ` — ${referee.wouldRehireExplanation}` : ""}`
        : "—",
    },
    { label: "Response to feedback", value: referee.feedbackResponse ?? "—" },
    { label: "Honesty/integrity concerns", value: referee.honestyConcerns ?? "—" },
    ...(referee.complianceIncidents ? [{ label: "Compliance incidents", value: referee.complianceIncidents }] : []),
    ...(referee.licenseStanding ? [{ label: "License/registration standing", value: referee.licenseStanding }] : []),
  ]);

  const recommendHireLabel =
    referee.recommendHire ??
    (referee.overallRecommendScore !== undefined ? recommendHireFromLegacyScore(referee.overallRecommendScore) : undefined);
  if (recommendHireLabel) drawRecommendBadge(ctx, recommendHireLabel);

  // Deprecated free-text field — only ever populated on historical records,
  // so it's omitted entirely (rather than showing "Not provided.") once a
  // report has nothing there.
  if (referee.conflictExample?.trim()) {
    drawParagraphSection(ctx, "Handling pressure, conflict, or a tough decision (legacy field)", referee.conflictExample);
  }
  drawParagraphSection(ctx, "Additional notes", referee.notes, "No additional notes.");
}

export async function generateReferenceCheckReportPdf(
  data: ReferenceCheckReportData,
  aiInsights: ReferenceCheckAiInsights | null = null
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Reference Check Report — ${data.candidateName}`);
  doc.setAuthor("Penda Health Recruitment System");
  const ctx = await buildCtx(doc);

  drawHeader(ctx, data.refId);
  drawSectionHeading(ctx, "Candidate");
  drawFactGrid(ctx, [
    { label: "Candidate", value: data.candidateName },
    { label: "Role", value: data.roleTitle || "—" },
    { label: "Reference check started", value: fmtDate(data.createdAt) },
  ]);
  drawStatusBanner(ctx, data);

  // Only drawn when AI generation succeeded (see
  // src/lib/ai/reference-check-summary.ts) — omitted silently on failure or
  // when it's not configured, same graceful-degradation approach as the
  // logo above.
  if (aiInsights) {
    drawAiSummarySection(ctx, aiInsights);
    drawDivider(ctx);
  }

  // Content flows continuously rather than forcing each referee onto its own
  // page — a referee with short answers no longer leaves most of a page
  // blank. ensureSpace() (called throughout drawRefereeSection) still breaks
  // to a new page whenever content actually doesn't fit. The divider line
  // after each section keeps the boundaries clear even when two sections
  // share a page.
  for (const [i, referee] of Array.from(data.referees.entries())) {
    drawRefereeSection(ctx, i + 1, referee);
    drawDivider(ctx);
  }

  drawFooter(ctx);
  return doc.save();
}
