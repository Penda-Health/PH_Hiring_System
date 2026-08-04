#!/usr/bin/env node
// Fixes the Work Trials table in two passes:
//
//  1. LOOKUP FIELDS — adds "Candidate Name" and "Branch Name" lookup columns
//     so Airtable shows readable names instead of linked-record IDs.
//
//  2. DEDUPLICATION — finds every candidate that has more than one Work Trial
//     record and deletes the weaker duplicates, keeping the one with the most
//     data (branch set → date set → scores present → most recently created).
//
// Usage: node scripts/fix-work-trials.js
// Requires AIRTABLE_API_KEY and AIRTABLE_BASE_ID in .env.local

const { loadEnv } = require("./lib/env");
loadEnv();

const API_KEY  = process.env.AIRTABLE_API_KEY;
const BASE_ID  = process.env.AIRTABLE_BASE_ID;

if (!API_KEY || !BASE_ID) {
  console.error("Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID.");
  process.exit(1);
}

const META_URL = `https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`;
const DATA_URL = `https://api.airtable.com/v0/${BASE_ID}`;

// ── helpers ───────────────────────────────────────────────────────────────────

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

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

async function allRecords(tableName) {
  const records = [];
  let offset;
  do {
    const params = new URLSearchParams({ pageSize: "100" });
    if (offset) params.set("offset", offset);
    const json = await req(`${DATA_URL}/${encodeURIComponent(tableName)}?${params}`);
    records.push(...(json.records || []));
    offset = json.offset;
    if (offset) await sleep(250); // stay under rate limit
  } while (offset);
  return records;
}

// Airtable allows bulk-deleting up to 10 records per request
async function deleteRecords(tableName, ids) {
  for (let i = 0; i < ids.length; i += 10) {
    const batch = ids.slice(i, i + 10);
    const params = batch.map(id => `records[]=${id}`).join("&");
    await req(`${DATA_URL}/${encodeURIComponent(tableName)}?${params}`, { method: "DELETE" });
    await sleep(250);
    console.log(`  deleted ${batch.length} record(s)`);
  }
}

// ── 1. Add lookup fields via Metadata API ─────────────────────────────────────

async function addLookupFields() {
  console.log("\n── Step 1: add lookup fields ───────────────────────────────");

  const { tables } = await req(META_URL);

  function findTable(name) {
    const t = tables.find(t => t.name === name);
    if (!t) throw new Error(`Table "${name}" not found`);
    return t;
  }
  function findField(table, name) {
    const f = table.fields.find(f => f.name === name);
    if (!f) throw new Error(`Field "${name}" not found in table "${table.name}"`);
    return f;
  }

  const workTrialsTable = findTable("Work Trials");
  const candidatesTable = findTable("Candidates");
  const branchesTable   = findTable("Branches");

  // Field IDs we need for lookup wiring
  const candidateLinkField = findField(workTrialsTable, "Candidate");
  const branchLinkField    = findField(workTrialsTable, "Branch");
  const candidateNameField = findField(candidatesTable, "Name");
  const branchNameField    = findField(branchesTable,   "Name");

  const addFieldUrl = `${META_URL}/${workTrialsTable.id}/fields`;

  const existingFieldNames = new Set(workTrialsTable.fields.map(f => f.name));

  const lookupsToAdd = [
    {
      label: "Candidate Name",
      payload: {
        name: "Candidate Name",
        type: "multipleLookupValues",
        options: {
          recordLinkFieldId:    candidateLinkField.id,
          fieldIdInLinkedTable: candidateNameField.id,
        },
      },
    },
    {
      label: "Branch Name",
      payload: {
        name: "Branch Name",
        type: "multipleLookupValues",
        options: {
          recordLinkFieldId:    branchLinkField.id,
          fieldIdInLinkedTable: branchNameField.id,
        },
      },
    },
  ];

  for (const { label, payload } of lookupsToAdd) {
    if (existingFieldNames.has(label)) {
      console.log(`  ✓ "${label}" already exists — skipping`);
      continue;
    }
    await req(addFieldUrl, { method: "POST", body: JSON.stringify(payload) });
    console.log(`  + added "${label}"`);
    await sleep(300);
  }
}

// ── 2. Deduplicate Work Trial records ─────────────────────────────────────────

function scoreRecord(r) {
  const f = r.fields;
  // Higher score = more data = record worth keeping
  let s = 0;
  if (Array.isArray(f["Branch"]) && f["Branch"].length) s += 4;
  if (f["Date"])                                         s += 4;
  if (f["Score Technical"] != null)                     s += 3;
  if (f["Score Patient"]   != null)                     s += 3;
  if (f["Score Culture"]   != null)                     s += 3;
  if (f["Form Submitted At"])                            s += 5;
  if (f["BM Scoring Link"])                              s += 2;
  if (f["Supervisor"])                                   s += 1;
  return s;
}

async function deduplicateWorkTrials() {
  console.log("\n── Step 2: deduplicate Work Trials ─────────────────────────");

  const records = await allRecords("Work Trials");
  console.log(`  fetched ${records.length} total Work Trial records`);

  // Group by the first linked Candidate record ID
  const byCandidateId = new Map();
  const orphaned = [];

  for (const r of records) {
    const links = r.fields["Candidate"];
    if (!Array.isArray(links) || links.length === 0) {
      orphaned.push(r.id);
      continue;
    }
    const candId = links[0];
    if (!byCandidateId.has(candId)) byCandidateId.set(candId, []);
    byCandidateId.get(candId).push(r);
  }

  const toDelete = [];

  for (const [candId, group] of byCandidateId) {
    if (group.length <= 1) continue;

    // Sort descending by score; ties broken by createdTime (most recent first)
    group.sort((a, b) => {
      const ds = scoreRecord(b) - scoreRecord(a);
      if (ds !== 0) return ds;
      return new Date(b.createdTime || 0) - new Date(a.createdTime || 0);
    });

    const [keep, ...dupes] = group;
    console.log(`  candidate ${candId}: keeping ${keep.id} (score ${scoreRecord(keep)}), deleting ${dupes.length} dupe(s)`);
    toDelete.push(...dupes.map(d => d.id));
  }

  if (orphaned.length) {
    console.log(`  ${orphaned.length} orphaned record(s) with no linked candidate — leaving intact`);
  }

  if (toDelete.length === 0) {
    console.log("  ✓ No duplicates found — nothing to delete");
    return;
  }

  console.log(`\n  Deleting ${toDelete.length} duplicate record(s)...`);
  await deleteRecords("Work Trials", toDelete);
  console.log(`  ✓ Done — ${toDelete.length} duplicates removed`);
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  try {
    await addLookupFields();
    await deduplicateWorkTrials();
    console.log("\n✓ All done.\n");
  } catch (err) {
    console.error("\n✗ Failed:", err.message);
    process.exit(1);
  }
}

main();
