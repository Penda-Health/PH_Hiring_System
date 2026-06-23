#!/usr/bin/env node
// Manually mints a work-trial, bm-feedback, or referee link for testing, by
// calling the same /api/forms/issue-link endpoint the Airtable automation
// calls.
//
// Usage:
//   node scripts/generate-form-link.js --type work-trial --work-trial-id rec123
//   node scripts/generate-form-link.js --type bm-feedback --work-trial-id rec123
//   node scripts/generate-form-link.js --type referee --ref-check-id rec123 --referee-num 1
//
// Add --base http://localhost:3000 to target a local dev server instead of
// NEXT_PUBLIC_APP_URL.

const { loadEnv } = require("./lib/env");

loadEnv();

function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

async function main() {
  const type = arg("type");
  const workTrialId = arg("work-trial-id");
  const refCheckId = arg("ref-check-id");
  const refereeNum = arg("referee-num");
  const base = arg("base") || process.env.NEXT_PUBLIC_APP_URL;
  const secret = process.env.FORMS_ISSUE_SECRET;

  if (!["work-trial", "bm-feedback", "referee"].includes(type)) {
    console.error(
      "Usage: --type work-trial|bm-feedback --work-trial-id <recId> [--base <url>]\n" +
        "   or: --type referee --ref-check-id <recId> --referee-num 1|2 [--base <url>]"
    );
    process.exit(1);
  }
  if (type === "referee" && (!refCheckId || !["1", "2"].includes(refereeNum))) {
    console.error("Missing --ref-check-id <recId> and/or --referee-num 1|2");
    process.exit(1);
  }
  if (type !== "referee" && !workTrialId) {
    console.error("Missing --work-trial-id <recId>");
    process.exit(1);
  }
  if (!base) {
    console.error("Missing NEXT_PUBLIC_APP_URL (or pass --base).");
    process.exit(1);
  }
  if (!secret) {
    console.error("Missing FORMS_ISSUE_SECRET in .env.local.");
    process.exit(1);
  }

  const body =
    type === "referee"
      ? { type, refCheckId, refereeNum: Number(refereeNum) }
      : { type, workTrialId };

  const res = await fetch(`${base.replace(/\/$/, "")}/api/forms/issue-link`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
    body: JSON.stringify(body),
  });
  const responseBody = await res.json();
  if (!res.ok) {
    console.error("Failed:", responseBody);
    process.exit(1);
  }
  console.log(responseBody.url);
}

main();
