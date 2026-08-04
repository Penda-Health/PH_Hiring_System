#!/usr/bin/env node
// Adds the 6 new comment/narrative fields to the Work Trials table:
//   Comment Culture, Comment Patient, Comment Technical,
//   Strengths, Areas of Development, Overall Recommendation
//
// Safe to re-run — already-existing fields are skipped.
// Usage: node scripts/add-wt-comment-fields.js

const { loadEnv } = require("./lib/env");
loadEnv();

const API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!API_KEY || !BASE_ID) {
  console.error("Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID.");
  process.exit(1);
}

const META_URL = `https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`;

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function req(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Airtable ${res.status}: ${JSON.stringify(json)}`);
  return json;
}

async function main() {
  const { tables } = await req(META_URL);
  const wt = tables.find((t) => t.name === "Work Trials");
  if (!wt) { console.error('Table "Work Trials" not found'); process.exit(1); }

  const existing = new Set(wt.fields.map((f) => f.name));
  const addFieldUrl = `${META_URL}/${wt.id}/fields`;

  const newFields = [
    "Comment Culture",
    "Comment Patient",
    "Comment Technical",
    "Strengths",
    "Areas of Development",
    "Overall Recommendation",
  ];

  for (const name of newFields) {
    if (existing.has(name)) {
      console.log(`  ✓ "${name}" already exists — skipping`);
      continue;
    }
    await req(addFieldUrl, {
      method: "POST",
      body: JSON.stringify({ name, type: "multilineText" }),
    });
    console.log(`  + added "${name}"`);
    await sleep(300);
  }

  console.log("\n✓ Done.\n");
}

main().catch((err) => {
  console.error("✗ Failed:", err.message);
  process.exit(1);
});
