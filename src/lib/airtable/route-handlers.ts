// Shared GET/POST/PATCH handler factories so each src/app/api/<resource>
// route.ts file is a thin one-liner instead of duplicating fetch/error
// handling 11 times.
import { NextRequest, NextResponse } from "next/server";
import { listRecords, createRecord, updateRecord, AirtableRecord } from "./client";

type FromAirtable<T> = (record: AirtableRecord) => T;
type ToAirtable<T> = (entity: Partial<T>) => Record<string, unknown>;

function errorResponse(err: unknown) {
  const message = err instanceof Error ? err.message : "Unknown error";
  return NextResponse.json({ error: message }, { status: 500 });
}

export function makeCollectionHandlers<T>(
  tableName: string,
  fromAirtable: FromAirtable<T>,
  toAirtable: ToAirtable<T>
) {
  async function GET() {
    try {
      const records = await listRecords(tableName);
      return NextResponse.json(records.map(fromAirtable));
    } catch (err) {
      return errorResponse(err);
    }
  }

  async function POST(request: NextRequest) {
    try {
      const body = (await request.json()) as Partial<T>;
      const record = await createRecord(tableName, toAirtable(body));
      return NextResponse.json(fromAirtable(record), { status: 201 });
    } catch (err) {
      return errorResponse(err);
    }
  }

  return { GET, POST };
}

export function makeItemHandlers<T>(
  tableName: string,
  fromAirtable: FromAirtable<T>,
  toAirtable: ToAirtable<T>
) {
  async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
    try {
      const body = (await request.json()) as Partial<T>;
      const record = await updateRecord(tableName, params.id, toAirtable(body));
      return NextResponse.json(fromAirtable(record));
    } catch (err) {
      return errorResponse(err);
    }
  }

  return { PATCH };
}
