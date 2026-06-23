import { makeCollectionHandlers } from "@/lib/airtable/route-handlers";
import { requisitionFromAirtable, requisitionToAirtable } from "@/lib/airtable/mappers";
import { TABLE_NAMES, F } from "@/lib/airtable/field-names";
import { requisitionSchema } from "@/lib/airtable/schemas";

export const { GET, POST } = makeCollectionHandlers(
  TABLE_NAMES.Requisitions,
  requisitionFromAirtable,
  requisitionToAirtable,
  { schema: requisitionSchema, genId: { airtableField: F.Requisitions.REQ_ID, prefix: "REQ", pad: 3, min: 6 } }
);
