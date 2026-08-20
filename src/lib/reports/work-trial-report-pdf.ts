// Renders a single work trial's assessment into a Penda-branded PDF.
//
// Two layouts, chosen by how the BM/Incharge actually submitted their
// assessment (see WorkTrialReportData.uploadedFormFiles):
//
//  - "Uploaded" path: a short branded cover sheet (candidate/trial details +
//    scores + the Overall Recommendation remarks) followed by the BM's
//    originally uploaded file (a scanned PDF or photo), merged in as-is —
//    the source of truth for that trial IS the uploaded document; the cover
//    sheet just makes it self-contained and presentable.
//  - "Online" path: everything was typed into the app, so there's no source
//    document to merge — the whole report is generated from the six comment
//    fields plus scores/metadata.
//
// pdf-lib was chosen specifically because it's the one popular JS PDF
// library that can both draw a styled page from scratch AND merge/copy
// pages from an existing uploaded PDF into the same document — the upload
// path needs both in one pass.
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import fs from "fs";
import path from "path";
import type { WorkTrialReportData } from "./work-trial-report";

const PAGE_W = 595.28; // A4, points
const PAGE_H = 841.89;
const MARGIN = 50;
const CONTENT_W = PAGE_W - MARGIN * 2;

// Pulled from tailwind.config.ts's `penda` palette so the PDF matches the
// rest of the app instead of inventing its own colors.
const BLUE = rgb(0x1e / 255, 0x55 / 255, 0xff / 255);
const BLUE_DARK = rgb(0x11 / 255, 0x35 / 255, 0xb8 / 255);
const BLUE_LIGHT = rgb(0xe4 / 255, 0xea / 255, 0xff / 255);
const CHARCOAL = rgb(0x34 / 255, 0x35 / 255, 0x39 / 255);
const SAND = rgb(0xfb / 255, 0xf4 / 255, 0xe4 / 255);
const GREY = rgb(0.42, 0.43, 0.46);
const WHITE = rgb(1, 1, 1);
// Matches the app's --destructive token (0 65% 51%) used for "Fail".
const RED = rgb(0.83, 0.19, 0.19);

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

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraphLine of text.split("\n")) {
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
  const eyebrow = "TALENT ACQUISITION · WORK TRIAL REPORT";
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

function drawSectionHeading(ctx: Ctx, text: string) {
  ensureSpace(ctx, 26);
  ctx.page.drawRectangle({ x: MARGIN, y: ctx.y - 12, width: 3, height: 14, color: BLUE });
  ctx.page.drawText(text, { x: MARGIN + 10, y: ctx.y - 10.5, size: 11.5, font: ctx.bold, color: CHARCOAL });
  ctx.y -= 26;
}

// Two-column label/value grid, e.g. candidate/trial metadata.
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

function scoreLabel(v: number | null): string {
  return v === null ? "—" : `${v}/100`;
}

// e.g. "Culture Observations (90/100)" — pairs the written notes with the
// numeric rating they explain (same "x/100" convention as the scores table
// above), rather than leaving the reader to flip back up to connect the two.
function ratedHeading(label: string, score: number | null): string {
  return score === null ? label : `${label} (${scoreLabel(score)})`;
}

function drawScoresTable(ctx: Ctx, data: WorkTrialReportData) {
  const rows: { label: string; weight: string; value: string }[] = [
    { label: "Culture", weight: "40%", value: scoreLabel(data.scoreCulture) },
    { label: "Patient Experience", weight: "40%", value: scoreLabel(data.scorePatient) },
    { label: "Technical", weight: "20%", value: scoreLabel(data.scoreTechnical) },
  ];
  const rowH = 22;
  const headerH = 22;
  ensureSpace(ctx, headerH + rows.length * rowH + 30);

  const col1 = MARGIN;
  const col2 = MARGIN + CONTENT_W * 0.55;
  const col3 = MARGIN + CONTENT_W * 0.78;

  ctx.page.drawRectangle({ x: MARGIN, y: ctx.y - headerH, width: CONTENT_W, height: headerH, color: BLUE_LIGHT });
  ctx.page.drawText("CATEGORY", { x: col1 + 8, y: ctx.y - 15, size: 8, font: ctx.bold, color: BLUE_DARK });
  ctx.page.drawText("WEIGHT", { x: col2, y: ctx.y - 15, size: 8, font: ctx.bold, color: BLUE_DARK });
  ctx.page.drawText("SCORE", { x: col3, y: ctx.y - 15, size: 8, font: ctx.bold, color: BLUE_DARK });
  ctx.y -= headerH;

  rows.forEach((row, i) => {
    if (i % 2 === 1) {
      ctx.page.drawRectangle({ x: MARGIN, y: ctx.y - rowH, width: CONTENT_W, height: rowH, color: rgb(0.97, 0.97, 0.98) });
    }
    ctx.page.drawText(row.label, { x: col1 + 8, y: ctx.y - 15, size: 10, font: ctx.regular, color: CHARCOAL });
    ctx.page.drawText(row.weight, { x: col2, y: ctx.y - 15, size: 10, font: ctx.regular, color: GREY });
    ctx.page.drawText(row.value, { x: col3, y: ctx.y - 15, size: 10, font: ctx.bold, color: CHARCOAL });
    ctx.y -= rowH;
  });

  // Total + result banner
  const bannerH = 32;
  const passColor = data.passFail === "Fail" ? RED : data.passFail === "Pass" ? BLUE : GREY;
  ctx.page.drawRectangle({ x: MARGIN, y: ctx.y - bannerH, width: CONTENT_W, height: bannerH, color: CHARCOAL });
  ctx.page.drawText("WEIGHTED TOTAL", { x: col1 + 8, y: ctx.y - bannerH / 2 - 3, size: 8.5, font: ctx.bold, color: WHITE });
  const totalText = data.total === null ? "—" : `${data.total}/100`;
  ctx.page.drawText(totalText, { x: col2, y: ctx.y - bannerH / 2 - 4, size: 12, font: ctx.bold, color: WHITE });
  const resultText = data.passFail.toUpperCase();
  const resultW = ctx.bold.widthOfTextAtSize(resultText, 12);
  ctx.page.drawRectangle({
    x: MARGIN + CONTENT_W - resultW - 24,
    y: ctx.y - bannerH / 2 - 9,
    width: resultW + 16,
    height: 18,
    color: passColor,
  });
  ctx.page.drawText(resultText, {
    x: MARGIN + CONTENT_W - resultW - 16,
    y: ctx.y - bannerH / 2 - 4,
    size: 12,
    font: ctx.bold,
    color: WHITE,
  });
  ctx.y -= bannerH + 24;
}

// Always renders the heading, even when there's no text — a blank
// section on an online-path report (where all six fields are required at
// submit time) is itself a signal worth surfacing rather than hiding, e.g.
// a legacy record from before a field existed, or data that didn't save
// correctly. Silently omitting it made those cases indistinguishable from
// "nothing to show here", which is what prompted this change.
function drawParagraphSection(ctx: Ctx, heading: string, text: string | undefined, placeholder = "No written notes captured for this section.") {
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

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function fmtDate(dateStr: string): string {
  if (!dateStr) return "—";
  const d = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}

function drawSignOff(ctx: Ctx, data: WorkTrialReportData) {
  drawSectionHeading(ctx, "Sign-off");
  const facts: { label: string; value: string }[] = [
    { label: "Submitted by", value: data.supervisor || "—" },
    { label: "Submitted as", value: data.submittedByRole ?? "—" },
    { label: "Date of submission", value: fmtDateTime(data.formSubmittedAt) },
    {
      label: "Branch Manager approval",
      value: data.bmApprovedAt ? `${data.branchManager || "Branch Manager"} — ${fmtDateTime(data.bmApprovedAt)}` : "Not required (submitted directly by BM)",
    },
  ];
  drawFactGrid(ctx, facts);
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

function drawCoverContent(ctx: Ctx, data: WorkTrialReportData) {
  drawHeader(ctx, `WT ${data.wtId}`);
  drawSectionHeading(ctx, "Candidate & Trial");
  drawFactGrid(ctx, [
    { label: "Candidate", value: data.candidateName },
    { label: "Role", value: [data.roleTitle, data.specialty].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(" · ") || "—" },
    { label: "Branch", value: data.branchName },
    { label: "Date of work trial", value: fmtDate(data.trialDate) },
  ]);
  drawScoresTable(ctx, data);
}

/** Full report generated from the online scoring form's six comment fields. */
async function generateOnlineReport(data: WorkTrialReportData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Work Trial Report — ${data.candidateName}`);
  doc.setAuthor("Penda Health Recruitment System");
  const ctx = await buildCtx(doc);

  drawCoverContent(ctx, data);
  drawParagraphSection(ctx, ratedHeading("Culture Observations", data.scoreCulture), data.commentCulture);
  drawParagraphSection(ctx, ratedHeading("Patient Experience Observations", data.scorePatient), data.commentPatient);
  drawParagraphSection(ctx, ratedHeading("Technical Observations", data.scoreTechnical), data.commentTechnical);
  drawParagraphSection(ctx, "Strengths", data.strengths);
  drawParagraphSection(ctx, "Areas of Development", data.areasOfDevelopment);
  drawParagraphSection(ctx, "Overall Recommendation", data.overallRecommendation);
  drawSignOff(ctx, data);
  drawFooter(ctx);

  return doc.save();
}

/**
 * Cover sheet + the BM's originally uploaded file merged in behind it.
 * The uploaded file is the source of truth here — this just makes it
 * self-contained (branding, scores, remarks) without needing the Airtable
 * attachment link alongside it.
 */
async function generateUploadedReport(data: WorkTrialReportData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Work Trial Report — ${data.candidateName}`);
  doc.setAuthor("Penda Health Recruitment System");
  const ctx = await buildCtx(doc);

  drawCoverContent(ctx, data);
  drawParagraphSection(ctx, "Overall Recommendation", data.overallRecommendation);
  drawSignOff(ctx, data);

  const file = data.uploadedFormFiles?.[0];

  if (!file) {
    // Submitted via the "upload a completed form" path, but no attachment
    // is on record — most likely the attachment upload failed after the
    // scores had already saved (see submitUploadedScores in
    // bm-feedback-form.ts). Say so plainly rather than quietly rendering a
    // report that just happens to have no source document attached — the
    // detailed notes the BM wrote on the physical/PDF form aren't captured
    // anywhere else in the system.
    ensureSpace(ctx, 48);
    const boxH = 40;
    ctx.page.drawRectangle({ x: MARGIN, y: ctx.y - boxH, width: CONTENT_W, height: boxH, color: rgb(1, 0.96, 0.9) });
    ctx.page.drawRectangle({ x: MARGIN, y: ctx.y - boxH, width: 3, height: boxH, color: RED });
    const lines = wrapText(
      "This trial was submitted with “upload a completed form”, but no attached file is on record — " +
        "the source assessment form may be missing. Contact the branch to have it re-submitted.",
      ctx.regular,
      9,
      CONTENT_W - 24
    );
    let ly = ctx.y - 14;
    for (const line of lines) {
      ctx.page.drawText(line, { x: MARGIN + 12, y: ly, size: 9, font: ctx.regular, color: CHARCOAL });
      ly -= 12;
    }
    ctx.y -= boxH + 12;
    drawFooter(ctx);
    return doc.save();
  }

  ensureSpace(ctx, 40);
  ctx.page.drawText("The uploaded assessment form follows this page.", {
    x: MARGIN,
    y: ctx.y - 4,
    size: 9,
    font: ctx.regular,
    color: GREY,
  });
  drawFooter(ctx);

  {
    try {
      const res = await fetch(file.url);
      if (res.ok) {
        const bytes = new Uint8Array(await res.arrayBuffer());
        const contentType = res.headers.get("content-type") ?? "";
        const isPdf = contentType.includes("pdf") || /\.pdf$/i.test(file.filename);
        const isPng = contentType.includes("png") || /\.png$/i.test(file.filename);

        if (isPdf) {
          const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
          const copied = await doc.copyPages(srcDoc, srcDoc.getPageIndices());
          copied.forEach((p) => doc.addPage(p));
        } else {
          const image = isPng ? await doc.embedPng(bytes) : await doc.embedJpg(bytes);
          const imgPage = doc.addPage([PAGE_W, PAGE_H]);
          const maxW = PAGE_W - MARGIN * 2;
          const maxH = PAGE_H - MARGIN * 2;
          const scale = Math.min(maxW / image.width, maxH / image.height, 1);
          const w = image.width * scale;
          const h = image.height * scale;
          imgPage.drawImage(image, { x: (PAGE_W - w) / 2, y: (PAGE_H - h) / 2, width: w, height: h });
        }
      } else {
        drawAttachmentFailureNote(ctx, doc, "The uploaded form could not be retrieved for this report.");
      }
    } catch {
      drawAttachmentFailureNote(ctx, doc, "The uploaded form could not be embedded in this report.");
    }
  }

  return doc.save();
}

function drawAttachmentFailureNote(ctx: Ctx, doc: PDFDocument, message: string) {
  const page = doc.addPage([PAGE_W, PAGE_H]);
  page.drawText(message, { x: MARGIN, y: PAGE_H - MARGIN - 20, size: 11, font: ctx.regular, color: RED });
}

export async function generateWorkTrialReportPdf(data: WorkTrialReportData): Promise<Uint8Array> {
  // submissionMethod is the authoritative signal (see bm-feedback-form.ts).
  // Trials submitted before that field existed have it as null — fall back
  // to inferring from file presence for those so old reports don't change.
  const hasUpload = Boolean(data.uploadedFormFiles && data.uploadedFormFiles.length > 0);
  const method = data.submissionMethod ?? (hasUpload ? "Uploaded" : "Online");
  return method === "Uploaded" ? generateUploadedReport(data) : generateOnlineReport(data);
}
