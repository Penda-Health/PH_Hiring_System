#!/usr/bin/env node
// One-off: creates the Kinoo and G44 branch rows in the live Airtable base
// as placeholders (see 4.9 in SETUP.md) so the Expansion Tracker
// (/expansion) has real branch rows to filter on. Real branch details
// (manager, capacity, etc.) can be filled in later directly in Airtable —
// this script only needs to run once, but is safe to re-run: it skips any
// branch name that already exists.
//
// Requires the Branches table's "Expansion Branch" column to already exist
// — run `npm run airtable:schema` first if you haven't.
//
//   node scripts/add-expansion-branches.js

const { loadEnv } = require("./lib/env");
const { F } = require("./lib/airtable-schema");

loadEnv();

const API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!API_KEY || !BASE_ID) {
  console.error("Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID. Check your .env.local file.");
  process.exit(1);
}

const BASE_URL = `https://api.airtable.com/v0/${BASE_ID}`;

async function airtableRequest(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Airtable API error ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

async function fetchAllBranchNames() {
  const names = new Set();
  let offset;
  do {
    const url = new URL(`${BASE_URL}/${encodeURIComponent("Branches")}`);
    url.searchParams.set("fields[]", F.Branches.NAME);
    if (offset) url.searchParams.set("offset", offset);
    const json = await airtableRequest(url.toString());
    for (const record of json.records) {
      const name = record.fields[F.Branches.NAME];
      if (name) names.add(name);
    }
    offset = json.offset;
  } while (offset);
  return names;
}

const PLACEHOLDER_BRANCHES = [
  {
    [F.Branches.BRANCH_ID]: "BR-09",
    [F.Branches.NAME]: "Kinoo",
    [F.Branches.CITY]: "Nairobi",
    [F.Branches.REGION]: "Nairobi",
    [F.Branches.BRANCH_MANAGER]: "TBD",
    [F.Branches.REGIONAL_MANAGER]: "Daniel Mwendwa",
    [F.Branches.CAPACITY]: 8,
    [F.Branches.ACTIVE]: true,
    [F.Branches.WORK_TRIAL_ACTIVE]: true,
    [F.Branches.EXPANSION_BRANCH]: true,
  },
  {
    [F.Branches.BRANCH_ID]: "BR-10",
    [F.Branches.NAME]: "G44",
    [F.Branches.CITY]: "Nairobi",
    [F.Branches.REGION]: "Nairobi",
    [F.Branches.BRANCH_MANAGER]: "TBD",
    [F.Branches.REGIONAL_MANAGER]: "Daniel Mwendwa",
    [F.Branches.CAPACITY]: 8,
    [F.Branches.ACTIVE]: true,
    [F.Branches.WORK_TRIAL_ACTIVE]: true,
    [F.Branches.EXPANSION_BRANCH]: true,
  },
];

async function main() {
  const existingNames = await fetchAllBranchNames();

  const toCreate = PLACEHOLDER_BRANCHES.filter((b) => !existingNames.has(b[F.Branches.NAME]));
  if (toCreate.length === 0) {
    console.log("Kinoo and G44 already exist in Branches — nothing to do.");
    return;
  }

  console.log(`Creating ${toCreate.length} branch(es): ${toCreate.map((b) => b[F.Branches.NAME]).join(", ")}`);
  const json = await airtableRequest(`${BASE_URL}/${encodeURIComponent("Branches")}`, {
    method: "POST",
    body: JSON.stringify({ records: toCreate.map((fields) => ({ fields })), typecast: true }),
  });
  for (const record of json.records) {
    console.log(`  ✅ ${record.fields[F.Branches.NAME]} → ${record.id}`);
  }
  console.log("\nDone. Real branch details (manager, capacity, etc.) can be filled in later directly in Airtable.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
