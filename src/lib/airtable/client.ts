// Server-only generic Airtable REST client. Table-specific shaping lives in
// mappers.ts; this file just knows how to talk to the Airtable API.
import { revalidateTag } from "next/cache";
import { getAirtableConfig } from "./config";

export type AirtableRecord = {
  id: string;
  fields: Record<string, unknown>;
  createdTime?: string;
};

type AirtableListResponse = { records: AirtableRecord[]; offset?: string };

async function airtableRequest(
  path: string,
  tableName: string,
  options: RequestInit = {}
): Promise<AirtableRecord & Partial<AirtableListResponse>> {
  const { apiKey, baseUrl } = getAirtableConfig();
  const res = await fetch(`${baseUrl}/${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    // Reads are cached briefly and tagged per table so a write can invalidate
    // just that table's cache via revalidateTag instead of going stale for a
    // full minute or re-fetching Airtable on every single page load.
    ...(options.method && options.method !== "GET"
      ? { cache: "no-store" as const }
      : { next: { revalidate: 30, tags: [`airtable:${tableName}`] } }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Airtable API error ${res.status}: ${JSON.stringify(json)}`);
  }
  return json;
}

export async function listRecords(tableName: string): Promise<AirtableRecord[]> {
  const records: AirtableRecord[] = [];
  let offset: string | undefined;
  do {
    const params = new URLSearchParams({ pageSize: "100" });
    if (offset) params.set("offset", offset);
    const json = await airtableRequest(`${encodeURIComponent(tableName)}?${params.toString()}`, tableName);
    records.push(...(json.records ?? []));
    offset = json.offset;
  } while (offset);
  return records;
}

export async function createRecord(
  tableName: string,
  fields: Record<string, unknown>
): Promise<AirtableRecord> {
  const json = await airtableRequest(`${encodeURIComponent(tableName)}`, tableName, {
    method: "POST",
    body: JSON.stringify({ fields, typecast: true }),
  });
  revalidateTag(`airtable:${tableName}`);
  return json;
}

export async function updateRecord(
  tableName: string,
  recordId: string,
  fields: Record<string, unknown>
): Promise<AirtableRecord> {
  const json = await airtableRequest(`${encodeURIComponent(tableName)}/${recordId}`, tableName, {
    method: "PATCH",
    body: JSON.stringify({ fields, typecast: true }),
  });
  revalidateTag(`airtable:${tableName}`);
  return json;
}

// Drops undefined values and unwraps `undefined` link arrays so Airtable
// doesn't choke on empty fields. Keeps `false`/`0`/`""` (those are real values).
export function cleanFields(fields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined) continue;
    out[key] = value;
  }
  return out;
}

export function link(recordId?: string | null): string[] | undefined {
  return recordId ? [recordId] : undefined;
}

export function firstLink(value: unknown): string | undefined {
  return Array.isArray(value) && value.length > 0 ? String(value[0]) : undefined;
}
