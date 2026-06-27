// Shared GET/POST/PATCH handler factories so each src/app/api/<resource>
// route.ts file is a thin one-liner instead of duplicating fetch/error
// handling 11 times.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { listRecords, createRecord, updateRecord, AirtableRecord } from "./client";

type FromAirtable<T> = (record: AirtableRecord) => T;
type ToAirtable<T> = (entity: Partial<T>) => Record<string, unknown>;

// Server-assigned human-readable IDs (e.g. "REQ-007", "rel-104") so two
// concurrent submissions can never collide the way client-side in-memory
// counters did (they reset on every reload/tab and aren't shared across
// sessions). Computed from the current max value in the field on each
// create — good enough for this app's write volume, not a distributed
// sequence guarantee.
export type GenIdConfig<T = unknown> = {
  airtableField: string;
  // A static prefix (e.g. "REQ"), or a function deriving it from the
  // request body — used when the same table mints IDs under different
  // prefixes depending on a field (e.g. OpenRoles: "IPS-001" vs "SO-001").
  prefix: string | ((body: Partial<T>) => string);
  pad?: number;
  min?: number;
};

async function nextSequentialId<T>(tableName: string, config: GenIdConfig<T>, body: Partial<T>): Promise<string> {
  const prefix = typeof config.prefix === "function" ? config.prefix(body) : config.prefix;
  const records = await listRecords(tableName);
  const pattern = new RegExp(`^${prefix}-(\\d+)$`, "i");
  let max = (config.min ?? 1) - 1;
  for (const record of records) {
    const value = record.fields[config.airtableField];
    const match = typeof value === "string" ? value.match(pattern) : null;
    if (match) max = Math.max(max, parseInt(match[1], 10));
  }
  const next = max + 1;
  const numStr = config.pad ? String(next).padStart(config.pad, "0") : String(next);
  return `${prefix}-${numStr}`;
}

function errorResponse(err: unknown, context: string) {
  console.error(`[api] ${context} failed:`, err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

function validationErrorResponse(error: z.ZodError) {
  return NextResponse.json(
    { error: "Invalid request body", issues: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) },
    { status: 400 }
  );
}

export function makeCollectionHandlers<T>(
  tableName: string,
  fromAirtable: FromAirtable<T>,
  toAirtable: ToAirtable<T>,
  options?: { schema?: z.ZodObject; genId?: GenIdConfig<T> }
) {
  async function GET() {
    try {
      const records = await listRecords(tableName);
      return NextResponse.json(records.map(fromAirtable));
    } catch (err) {
      return errorResponse(err, `GET ${tableName}`);
    }
  }

  async function POST(request: NextRequest) {
    try {
      const json = await request.json();
      let body: Partial<T>;
      if (options?.schema) {
        const result = options.schema.safeParse(json);
        if (!result.success) return validationErrorResponse(result.error);
        body = result.data as Partial<T>;
      } else {
        body = json as Partial<T>;
      }
      const fields = toAirtable(body);
      if (options?.genId) {
        fields[options.genId.airtableField] = await nextSequentialId(tableName, options.genId, body);
      }
      const record = await createRecord(tableName, fields);
      return NextResponse.json(fromAirtable(record), { status: 201 });
    } catch (err) {
      return errorResponse(err, `POST ${tableName}`);
    }
  }

  return { GET, POST };
}

export function makeItemHandlers<T>(
  tableName: string,
  fromAirtable: FromAirtable<T>,
  toAirtable: ToAirtable<T>,
  options?: { schema?: z.ZodObject }
) {
  const patchSchema = options?.schema?.partial();

  async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const json = await request.json();
      let body: Partial<T>;
      if (patchSchema) {
        const result = patchSchema.safeParse(json);
        if (!result.success) return validationErrorResponse(result.error);
        body = result.data as Partial<T>;
      } else {
        body = json as Partial<T>;
      }
      const record = await updateRecord(tableName, params.id, toAirtable(body));
      return NextResponse.json(fromAirtable(record));
    } catch (err) {
      return errorResponse(err, `PATCH ${tableName}/${params.id}`);
    }
  }

  return { PATCH };
}
