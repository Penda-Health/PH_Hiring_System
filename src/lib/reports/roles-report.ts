// The downloadable roles report (Open Roles Register → "Download report"):
// the same RoleSummaryRow data as the IPS weekly summary, filtered by the
// user, rendered as a landscape Penda-branded PDF table or a CSV that opens
// cleanly in Excel / Google Sheets.
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "pdf-lib";
import fs from "fs";
import path from "path";
import { sanitizeForPdf } from "./reference-check-report-pdf";
import {
  formatHeadcount,
  formatPipeline,
  formatShortDate,
  type RoleSummaryFilters,
  type RoleSummaryRow,
} from "@/lib/roles/role-summary";

export interface RolesReportOptions {
  includePipeline: boolean;
  includeUpdates: boolean;
  /** How many of each role's latest updates to include. */
  updatesPerRole: number;
}

// ── CSV ────────────────────────────────────────────────────────────────────

function csvCell(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function buildRolesReportCsv(rows: RoleSummaryRow[], opts: RolesReportOptions): string {
  const header = [
    "Role ID",
    "Role",
    "Segment",
    "Department",
    "Location",
    "Priority",
    "Status",
    "Recruiter",
    "HC Approved",
    "HC Filled",
    "HC Open",
    "Date Posted",
    "Date Closed",
    "Days Open",
    ...(opts.includePipeline ? ["Active Candidates", "Pipeline by Stage"] : []),
    ...(opts.includeUpdates ? ["Updates"] : []),
  ];
  const lines = rows.map((r) =>
    [
      r.roleId,
      r.title,
      r.segment,
      r.department,
      r.location,
      r.priority,
      r.status,
      r.recruiter || "Unassigned",
      formatHeadcount(r.hcApproved),
      formatHeadcount(r.hcFilled),
      formatHeadcount(r.hcOpen),
      r.datePosted?.slice(0, 10) ?? "",
      r.dateClosed?.slice(0, 10) ?? "",
      r.daysOpen ?? "",
      ...(opts.includePipeline ? [r.pipelineTotal, formatPipeline(r)] : []),
      ...(opts.includeUpdates
        ? [
            r.updates
              .slice(0, opts.updatesPerRole)
              .map((u) => `${u.createdAt.slice(0, 10)} ${u.authorName}: ${u.comment}`)
              .join("\n"),
          ]
        : []),
    ]
      .map(csvCell)
      .join(",")
  );
  // Leading BOM so Excel reads the file as UTF-8 (names, en dashes, …).
  return "﻿" + [header.map(csvCell).join(","), ...lines].join("\r\n");
}

// ── PDF ────────────────────────────────────────────────────────────────────

const PAGE_W = 841.89; // A4 landscape, points
const PAGE_H = 595.28;
const MARGIN = 36;
const CONTENT_W = PAGE_W - MARGIN * 2;
const SIZE = 8.5;
const LINE_H = 11.5;
const PAD_X = 5;
const PAD_Y = 5;

const BLUE = rgb(0x1e / 255, 0x55 / 255, 0xff / 255);
const BLUE_DARK = rgb(0x11 / 255, 0x35 / 255, 0xb8 / 255);
const CHARCOAL = rgb(0x34 / 255, 0x35 / 255, 0x39 / 255);
const SAND = rgb(0xfb / 255, 0xf4 / 255, 0xe4 / 255);
const GREY = rgb(0.42, 0.43, 0.46);
const WHITE = rgb(1, 1, 1);
const BORDER = rgb(0.86, 0.87, 0.89);
const ZEBRA = rgb(0.975, 0.978, 0.985);
const RED = rgb(0.83, 0.19, 0.19);
const AMBER = rgb(0.72, 0.5, 0.09);

const LOGO_PATH = path.join(process.cwd(), "public", "assets", "logo.png");

type Ctx = {
  doc: PDFDocument;
  regular: PDFFont;
  bold: PDFFont;
  logo: Awaited<ReturnType<PDFDocument["embedPng"]>> | null;
  page: PDFPage;
  y: number;
  pageNum: number;
  generatedAt: Date;
};

type Column = {
  label: string;
  /** Relative width; the flexible columns share whatever is left. */
  width: number;
  value: (r: RoleSummaryRow) => string;
};

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const out: string[] = [];
  for (const para of sanitizeForPdf(text).split("\n")) {
    const words = para.split(/\s+/).filter(Boolean);
    let current = "";
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) > maxWidth && current) {
        out.push(current);
        current = word;
      } else {
        current = next;
      }
    }
    out.push(current);
  }
  return out;
}

function drawFooter(ctx: Ctx) {
  const label = `Penda Health Recruitment System · Generated ${formatShortDate(ctx.generatedAt.toISOString())}`;
  ctx.page.drawText(label, { x: MARGIN, y: 20, size: 7.5, font: ctx.regular, color: GREY });
  const pageLabel = `Page ${ctx.pageNum}`;
  const w = ctx.regular.widthOfTextAtSize(pageLabel, 7.5);
  ctx.page.drawText(pageLabel, { x: PAGE_W - MARGIN - w, y: 20, size: 7.5, font: ctx.regular, color: GREY });
}

function drawBanner(ctx: Ctx) {
  const h = 52;
  ctx.page.drawRectangle({ x: 0, y: PAGE_H - h, width: PAGE_W, height: h, color: SAND });
  if (ctx.logo) {
    const logoH = 22;
    const logoW = (ctx.logo.width / ctx.logo.height) * logoH;
    ctx.page.drawImage(ctx.logo, { x: MARGIN, y: PAGE_H - h / 2 - logoH / 2, width: logoW, height: logoH });
  }
  const eyebrow = "TALENT ACQUISITION · ROLES REPORT";
  const w = ctx.bold.widthOfTextAtSize(eyebrow, 8.5);
  ctx.page.drawText(eyebrow, { x: PAGE_W - MARGIN - w, y: PAGE_H - h / 2 - 3, size: 8.5, font: ctx.bold, color: BLUE_DARK });
  ctx.y = PAGE_H - h - 22;
}

function newPage(ctx: Ctx) {
  drawFooter(ctx);
  ctx.page = ctx.doc.addPage([PAGE_W, PAGE_H]);
  ctx.pageNum += 1;
  drawBanner(ctx);
}

function describeFilters(f: RoleSummaryFilters): string {
  const parts: string[] = [];
  const list = (label: string, v?: string[]) => v && v.length && parts.push(`${label}: ${v.join(", ")}`);
  list("Segment", f.segments);
  list("Status", f.statuses);
  list("Priority", f.priorities);
  list("Department", f.departments);
  list("Location", f.locations);
  list("Recruiter", f.recruiters);
  if (f.postedFrom || f.postedTo) {
    parts.push(
      `Posted: ${f.postedFrom ? formatShortDate(f.postedFrom) : "any"} – ${f.postedTo ? formatShortDate(f.postedTo) : "any"}`
    );
  }
  return parts.length ? parts.join(" · ") : "All roles";
}

function drawSummary(ctx: Ctx, rows: RoleSummaryRow[], filters: RoleSummaryFilters) {
  ctx.page.drawText("Roles Report", { x: MARGIN, y: ctx.y - 14, size: 16, font: ctx.bold, color: CHARCOAL });
  ctx.y -= 26;
  for (const line of wrap(`Filters — ${describeFilters(filters)}`, ctx.regular, 9, CONTENT_W)) {
    ctx.page.drawText(line, { x: MARGIN, y: ctx.y - 9, size: 9, font: ctx.regular, color: GREY });
    ctx.y -= 13;
  }
  ctx.y -= 6;

  const open = rows.filter((r) => r.status === "Open");
  const tiles = [
    { label: "Roles in report", value: String(rows.length) },
    { label: "Open roles", value: String(open.length) },
    { label: "Headcount gap (open)", value: formatHeadcount(open.reduce((s, r) => s + r.hcOpen, 0)) },
    { label: "Candidates in pipeline", value: String(rows.reduce((s, r) => s + r.pipelineTotal, 0)) },
    {
      label: "Open > 60 days",
      value: String(open.filter((r) => (r.daysOpen ?? 0) > 60).length),
    },
  ];
  const gap = 8;
  const tileW = (CONTENT_W - gap * (tiles.length - 1)) / tiles.length;
  const tileH = 40;
  tiles.forEach((t, i) => {
    const x = MARGIN + i * (tileW + gap);
    ctx.page.drawRectangle({ x, y: ctx.y - tileH, width: tileW, height: tileH, color: ZEBRA, borderColor: BORDER, borderWidth: 0.6 });
    ctx.page.drawText(t.value, { x: x + 10, y: ctx.y - 19, size: 14, font: ctx.bold, color: BLUE_DARK });
    ctx.page.drawText(t.label, { x: x + 10, y: ctx.y - 32, size: 7.5, font: ctx.regular, color: GREY });
  });
  ctx.y -= tileH + 16;
}

function columnsFor(opts: RolesReportOptions): Column[] {
  const cols: Column[] = [
    { label: "Role", width: 1.55, value: (r) => `${r.title}\n${r.roleId}` },
    { label: "Seg.", width: 0.4, value: (r) => r.segment },
    { label: "Location / Dept", width: 1.15, value: (r) => [r.location, r.department].filter(Boolean).join("\n") || "—" },
    { label: "Priority", width: 0.6, value: (r) => r.priority },
    { label: "Status", width: 0.6, value: (r) => r.status },
    { label: "HC open", width: 0.55, value: (r) => `${formatHeadcount(r.hcOpen)} of ${formatHeadcount(r.hcApproved)}` },
    {
      label: "Posted",
      width: 0.85,
      value: (r) =>
        r.datePosted
          ? `${formatShortDate(r.datePosted)}${r.daysOpen !== null ? `\n${r.daysOpen} days${r.status === "Open" ? " open" : ""}` : ""}`
          : "—",
    },
    { label: "Recruiter", width: 0.85, value: (r) => r.recruiter || "Unassigned" },
  ];
  if (opts.includePipeline) {
    cols.push({ label: "Pipeline", width: 1.15, value: (r) => (r.pipelineTotal ? `${r.pipelineTotal} active\n${formatPipeline(r)}` : "No active candidates") });
  }
  if (opts.includeUpdates) {
    cols.push({
      label: "Recruiter updates",
      width: 2.4,
      value: (r) =>
        r.updates.length
          ? r.updates
              .slice(0, opts.updatesPerRole)
              .map((u) => `• ${formatShortDate(u.createdAt)}, ${u.authorName}: ${u.comment.replace(/\s+/g, " ").trim()}`)
              .join("\n")
          : "No updates yet",
    });
  }
  return cols;
}

function priorityColor(p: string) {
  return p === "Critical" ? RED : p === "High" ? AMBER : CHARCOAL;
}

function drawTable(ctx: Ctx, rows: RoleSummaryRow[], opts: RolesReportOptions) {
  const cols = columnsFor(opts);
  const totalWeight = cols.reduce((s, c) => s + c.width, 0);
  const widths = cols.map((c) => (c.width / totalWeight) * CONTENT_W);

  const drawHead = () => {
    const h = LINE_H + PAD_Y * 2;
    ctx.page.drawRectangle({ x: MARGIN, y: ctx.y - h, width: CONTENT_W, height: h, color: BLUE });
    let x = MARGIN;
    cols.forEach((c, i) => {
      ctx.page.drawText(c.label, { x: x + PAD_X, y: ctx.y - PAD_Y - 8.5, size: 8, font: ctx.bold, color: WHITE });
      x += widths[i];
    });
    ctx.y -= h;
  };

  if (rows.length === 0) {
    ctx.page.drawText("No roles match these filters.", { x: MARGIN, y: ctx.y - 12, size: 10, font: ctx.regular, color: GREY });
    return;
  }

  drawHead();
  rows.forEach((row, rowIdx) => {
    const cells = cols.map((c, i) => wrap(c.value(row), ctx.regular, SIZE, widths[i] - PAD_X * 2));
    const maxLines = Math.max(...cells.map((l) => l.length));
    const available = ctx.y - (MARGIN + 14);
    const fullH = maxLines * LINE_H + PAD_Y * 2;
    // Rows taller than a whole page (very long update histories) are clipped
    // rather than split, so a role never straddles two pages.
    const maxPageLines = Math.floor((PAGE_H - 52 - 22 - (LINE_H + PAD_Y * 2) - MARGIN - 14 - PAD_Y * 2) / LINE_H);
    if (fullH > available) {
      newPage(ctx);
      drawHead();
    }
    const lines = Math.min(maxLines, maxPageLines);
    const h = lines * LINE_H + PAD_Y * 2;
    if (rowIdx % 2 === 1) ctx.page.drawRectangle({ x: MARGIN, y: ctx.y - h, width: CONTENT_W, height: h, color: ZEBRA });
    ctx.page.drawLine({ start: { x: MARGIN, y: ctx.y - h }, end: { x: MARGIN + CONTENT_W, y: ctx.y - h }, thickness: 0.6, color: BORDER });

    let x = MARGIN;
    cells.forEach((cellLines, i) => {
      const shown = cellLines.slice(0, lines);
      if (cellLines.length > lines) shown[lines - 1] = `${shown[lines - 1]}…`;
      shown.forEach((text, li) => {
        const isRoleTitle = i === 0 && li === 0;
        const font = isRoleTitle ? ctx.bold : ctx.regular;
        const color = cols[i].label === "Priority" ? priorityColor(row.priority) : i === 0 && li > 0 ? GREY : CHARCOAL;
        ctx.page.drawText(text, { x: x + PAD_X, y: ctx.y - PAD_Y - 8.5 - li * LINE_H, size: SIZE, font, color });
      });
      x += widths[i];
    });
    ctx.y -= h;
  });
}

export async function generateRolesReportPdf(
  rows: RoleSummaryRow[],
  filters: RoleSummaryFilters,
  opts: RolesReportOptions,
  generatedAt: Date = new Date()
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle("Roles Report");
  doc.setAuthor("Penda Health Recruitment System");
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  let logo: Ctx["logo"] = null;
  try {
    logo = await doc.embedPng(fs.readFileSync(LOGO_PATH));
  } catch {
    logo = null; // the report still generates without the logo
  }
  const ctx: Ctx = { doc, regular, bold, logo, page: doc.addPage([PAGE_W, PAGE_H]), y: 0, pageNum: 1, generatedAt };
  drawBanner(ctx);
  drawSummary(ctx, rows, filters);
  drawTable(ctx, rows, opts);
  drawFooter(ctx);
  return doc.save();
}
