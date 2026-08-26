// Renders a single reference check into a Penda-branded PDF: a cover with
// candidate/role/status, then one section per referee. Unlike the work-trial
// report there's no "uploaded source document" case to merge in — every
// reference check is structured data collected through /referee — so there's
// just the one layout, and it degrades gracefully when only one of the two
// referees has responded (the other section says so plainly rather than
// showing blanks).
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import fs from "fs";
import path from "path";
import type { ReferenceCheckReportData } from "./reference-check-report";
import type { RefereeStatus } from "@/types";

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

function drawSectionHeading(ctx: Ctx, text: string) {
  ensureSpace(ctx, 26);
  ctx.page.drawRectangle({ x: MARGIN, y: ctx.y - 12, width: 3, height: 14, color: BLUE });
  ctx.page.drawText(text, { x: MARGIN + 10, y: ctx.y - 10.5, size: 11.5, font: ctx.bold, color: CHARCOAL });
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

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
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

function drawRefereeSection(ctx: Ctx, num: 1 | 2, referee: RefereeStatus) {
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

  drawFactGrid(ctx, [
    { label: "Email", value: referee.email },
    { label: "Phone", value: referee.phone },
    { label: "Relationship to candidate", value: referee.relationship ?? "—" },
    { label: "How long they've known the candidate", value: referee.durationKnown ?? "—" },
    { label: "Responded", value: fmtDateTime(referee.respondedAt) },
    { label: "Identity verification", value: verificationLabel },
  ]);

  drawFactGrid(ctx, [
    { label: "Technical score", value: scoreLabel(referee.techScore) },
    { label: "Reliability score", value: scoreLabel(referee.reliabilityScore) },
    { label: "Teamwork score", value: scoreLabel(referee.teamworkScore) },
    { label: "Would rehire", value: referee.wouldRehire ?? "—" },
  ]);

  drawParagraphSection(ctx, "Example of a strength", referee.strengthExample);
  drawParagraphSection(ctx, "Areas for development", referee.developmentAreas);
  drawParagraphSection(ctx, "Additional notes", referee.notes, "No additional notes.");
}

export async function generateReferenceCheckReportPdf(data: ReferenceCheckReportData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Reference Check Report — ${data.candidateName}`);
  doc.setAuthor("Penda Health Recruitment System");
  const ctx = await buildCtx(doc);

  drawHeader(ctx, data.refId);
  drawSectionHeading(ctx, "Candidate");
  drawFactGrid(ctx, [
    { label: "Candidate", value: data.candidateName },
    { label: "Role", value: data.roleTitle || "—" },
    { label: "Reference check started", value: fmtDateTime(data.createdAt) },
  ]);
  drawStatusBanner(ctx, data);

  drawRefereeSection(ctx, 1, data.referee1);
  drawRefereeSection(ctx, 2, data.referee2);

  drawFooter(ctx);
  return doc.save();
}
