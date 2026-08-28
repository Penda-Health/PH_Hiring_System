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

const MAX_RETRIES = 3;

// Per-attempt network timeout. Vercel serverless functions get killed
// outright (25s on Hobby/Pro) if they never return an initial response —
// and a stalled TCP connection to Airtable (no HTTP error, just a fetch()
// that never resolves) used to do exactly that: it isn't a 429/5xx, so it
// never hit the retry logic below, and just sat there until the platform
// force-killed the whole function. Bounding each attempt means a stall
// fails fast and falls into the same retry/backoff path as a 429/5xx,
// instead of eating the entire function's time budget on one hung request.
const REQUEST_TIMEOUT_MS = 10_000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function airtableRequest(
  path: string,
  tableName: string,
  options: RequestInit = {}
): Promise<AirtableRecord & Partial<AirtableListResponse>> {
  const { apiKey, baseUrl } = getAirtableConfig();

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let res: Response;
    try {
      res = await fetch(`${baseUrl}/${path}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          ...(options.headers || {}),
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        // Reads are cached briefly and tagged per table so a write can invalidate
        // just that table's cache via revalidateTag instead of going stale for a
        // full minute or re-fetching Airtable on every single page load.
        ...(options.method && options.method !== "GET"
          ? { cache: "no-store" as const }
          : { next: { revalidate: 30, tags: [`airtable:${tableName}`] } }),
      });
    } catch (err) {
      // A stalled/dropped connection or a timed-out attempt (AbortError)
      // throws instead of resolving with a bad status — treat it the same
      // as a retryable 5xx rather than letting it bubble up uncaught, since
      // it's just as likely to be a transient network blip.
      if (attempt < MAX_RETRIES) {
        await sleep(2 ** attempt * 300);
        continue;
      }
      throw new Error(
        `Airtable API request failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    if (res.ok) {
      return await res.json().catch(() => ({}));
    }

    // Airtable rate-limits at 5 req/sec per base (429) and occasionally
    // returns transient 5xx — both are worth a short backoff retry before
    // giving up, since a burst of parallel table fetches can easily trip
    // the rate limit on every page load.
    const isRetryable = res.status === 429 || res.status >= 500;
    if (isRetryable && attempt < MAX_RETRIES) {
      await sleep(2 ** attempt * 300);
      continue;
    }

    const json = await res.json().catch(() => ({}));
    throw new Error(`Airtable API error ${res.status}: ${JSON.stringify(json)}`);
  }

  throw new Error("Airtable API error: exhausted retries");
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

export async function listRecordsFiltered(
  tableName: string,
  filterByFormula: string
): Promise<AirtableRecord[]> {
  const records: AirtableRecord[] = [];
  let offset: string | undefined;
  do {
    const params = new URLSearchParams({ pageSize: "100", filterByFormula });
    if (offset) params.set("offset", offset);
    const json = await airtableRequest(`${encodeURIComponent(tableName)}?${params.toString()}`, tableName, {
      cache: "no-store",
    });
    records.push(...(json.records ?? []));
    offset = json.offset;
  } while (offset);
  return records;
}

export async function getRecord(tableName: string, recordId: string): Promise<AirtableRecord | null> {
  try {
    return await airtableRequest(`${encodeURIComponent(tableName)}/${recordId}`, tableName);
  } catch (err) {
    // A record that's been deleted, or an ID from a stale/forged link, 404s
    // rather than erroring — every call site already has a `not_found`
    // branch that checks for a falsy result, so surface that instead of
    // throwing and forcing a 500 for what's really a routine "not found".
    if (err instanceof Error && /Airtable API error 404/.test(err.message)) return null;
    throw err;
  }
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

export async function deleteRecord(tableName: string, recordId: string): Promise<void> {
  await airtableRequest(`${encodeURIComponent(tableName)}/${recordId}`, tableName, {
    method: "DELETE",
  });
  revalidateTag(`airtable:${tableName}`);
}

// Attachments go through a dedicated Airtable endpoint (content.airtable.com,
// not api.airtable.com) that takes the file inline as base64 rather than a
// publicly-fetchable URL — this app has no file host of its own, and this
// avoids needing one. recordId must already exist; this only appends to an
// attachment field on it, same as any other single-record update.
export async function uploadAttachment(
  tableName: string,
  recordId: string,
  fieldName: string,
  file: { filename: string; contentType: string; base64: string }
): Promise<AirtableRecord> {
  const { apiKey, baseId } = getAirtableConfig();
  const url = `https://content.airtable.com/v0/${baseId}/${recordId}/${encodeURIComponent(fieldName)}/uploadAttachment`;
  // Base64 file bodies can legitimately take longer than a plain list/get
  // call, hence the longer timeout than REQUEST_TIMEOUT_MS above — but it
  // still needs a bound for the same reason: an unbounded fetch() that
  // stalls mid-upload hangs the whole serverless function until Vercel
  // force-kills it, rather than failing fast into the retry loop below.
  const UPLOAD_TIMEOUT_MS = 20_000;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contentType: file.contentType,
          file: file.base64,
          filename: file.filename,
        }),
        signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS),
      });
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        await sleep(2 ** attempt * 300);
        continue;
      }
      throw new Error(
        `Airtable attachment upload failed: ${err instanceof Error ? err.message : String(err)}`
      );
    }

    if (res.ok) {
      const json = await res.json().catch(() => ({}));
      revalidateTag(`airtable:${tableName}`);
      return json as AirtableRecord;
    }

    const isRetryable = res.status === 429 || res.status >= 500;
    if (isRetryable && attempt < MAX_RETRIES) {
      await sleep(2 ** attempt * 300);
      continue;
    }

    const json = await res.json().catch(() => ({}));
    throw new Error(`Airtable attachment upload error ${res.status}: ${JSON.stringify(json)}`);
  }

  throw new Error("Airtable attachment upload error: exhausted retries");
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

// Multi-id counterpart to link() — for writing a full multipleRecordLinks
// list back (e.g. OpenRole.branchIds), not just a single id. An empty array
// is a deliberate "clear the link field" write, not "leave it alone" —
// callers that mean the latter should pass undefined instead.
export function links(recordIds?: string[]): string[] | undefined {
  return recordIds;
}

export function firstLink(value: unknown): string | undefined {
  return Array.isArray(value) && value.length > 0 ? String(value[0]) : undefined;
}

// Every linked record ID on a multipleRecordLinks field, not just the
// first — needed for fields like Open Roles' Branch link, where a role can
// legitimately be linked to several branches at once (see OpenRole.branchIds).
export function allLinks(value: unknown): string[] {
  return Array.isArray(value) ? value.map(String) : [];
}

// Escapes a value for interpolation into an Airtable filterByFormula string
// literal ('...'). Airtable formulas use backslash as the escape character,
// so backslashes must be escaped first — escaping the quote alone (as a
// naive `replace(/'/g, "\\'")` does) leaves a trailing unescaped backslash
// reachable by ending user input in a backslash, which can break out of the
// quoted literal. Centralized here so every formula built from user input
// (public form lookups, etc.) escapes the same way.
export function escapeFormulaValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}
