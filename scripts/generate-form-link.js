#!/usr/bin/env node
// Manually mints a work-trial or bm-feedback link for testing, by calling
// the same /api/forms/issue-link endpoint the Airtable automation calls.
//
// Usage:
//   node scripts/generate-form-link.js --type work-trial --work-trial-id rec123
//   node scripts/generate-form-link.js --type bm-feedback --work-trial-id rec123
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
  const base = arg("base") || process.env.NEXT_PUBLIC_APP_URL;
  const secret = process.env.FORMS_ISSUE_SECRET;

  if (!["work-trial", "bm-feedback"].includes(type)) {
    console.error("Usage: --type work-trial|bm-feedback --work-trial-id <recId> [--base <url>]");
    process.exit(1);
  }
  if (!workTrialId) {
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

  const res = await fetch(`${base.replace(/\/$/, "")}/api/forms/issue-link`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
    body: JSON.stringify({ type, workTrialId }),
  });
  const body = await res.json();
  if (!res.ok) {
    console.error("Failed:", body);
    process.exit(1);
  }
  console.log(body.url);
}

main();
