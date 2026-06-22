#!/usr/bin/env node
// Creates (or repairs) all 11 Airtable tables that mirror src/types.ts.
// Safe to re-run: existing tables are left alone and only missing fields
// are added, so this can also be used to patch a base after a schema change.
//
// Usage: node scripts/build-airtable-schema.js
// Requires AIRTABLE_API_KEY (a personal access token with
// schema.bases:write + data.records:write scopes) and AIRTABLE_BASE_ID in
// .env.local or .env.

const { loadEnv } = require("./lib/env");
const { TABLES } = require("./lib/airtable-schema");

loadEnv();

const API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ID;

if (!API_KEY || !BASE_ID) {
  console.error("Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID. Check your .env.local file.");
  process.exit(1);
}

const META_URL = `https://api.airtable.com/v0/meta/bases/${BASE_ID}/tables`;

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

function getExistingTables() {
  return airtableRequest(META_URL, { method: "GET" }).then((json) => json.tables || []);
}

function resolveFieldPayload(field, tableIdByName) {
  if (field.type === "multipleRecordLinks") {
    const linkedTableId = tableIdByName[field.linkedTable];
    if (!linkedTableId) {
      throw new Error(`Cannot create link field "${field.name}" — table "${field.linkedTable}" doesn't exist yet`);
    }
    return { name: field.name, type: field.type, options: { linkedTableId } };
  }
  return { name: field.name, type: field.type, ...(field.options ? { options: field.options } : {}) };
}

function createTable(table, tableIdByName) {
  const fields = table.fields.map((f) => resolveFieldPayload(f, tableIdByName));
  const body = { name: table.name, fields };
  return airtableRequest(META_URL, { method: "POST", body: JSON.stringify(body) });
}

function addFieldToTable(tableId, field, tableIdByName) {
  const payload = resolveFieldPayload(field, tableIdByName);
  return airtableRequest(`${META_URL}/${tableId}/fields`, { method: "POST", body: JSON.stringify(payload) });
}

async function main() {
  console.log(`Building Airtable schema in base ${BASE_ID}\n`);

  const existingTables = await getExistingTables();
  const tableIdByName = {};
  for (const t of existingTables) tableIdByName[t.name] = t.id;

  for (const table of TABLES) {
    const existing = existingTables.find((t) => t.name === table.name);

    if (existing) {
      console.log(`= "${table.name}" already exists, checking for missing fields...`);
      const existingFieldNames = new Set(existing.fields.map((f) => f.name));
      for (const field of table.fields) {
        if (existingFieldNames.has(field.name)) continue;
        console.log(`  + adding missing field "${field.name}"`);
        await addFieldToTable(existing.id, field, tableIdByName);
      }
      continue;
    }

    console.log(`+ creating "${table.name}" (${table.fields.length} fields)...`);
    const created = await createTable(table, tableIdByName);
    tableIdByName[table.name] = created.id;
    console.log(`  done (${created.id})`);
  }

  console.log("\nAll 11 tables are in place.");
}

main().catch((err) => {
  console.error("\nSchema build failed:", err.message);
  process.exit(1);
});
