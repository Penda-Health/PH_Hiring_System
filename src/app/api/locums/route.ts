import { makeCollectionHandlers } from "@/lib/airtable/route-handlers";
import { locumFromAirtable, locumToAirtable } from "@/lib/airtable/mappers";
import { TABLE_NAMES, F } from "@/lib/airtable/field-names";
import { locumSchema } from "@/lib/airtable/schemas";

export const { GET, POST } = makeCollectionHandlers(TABLE_NAMES.Locums, locumFromAirtable, locumToAirtable, {
  schema: locumSchema,
  genId: { airtableField: F.Locums.LOCUM_ID, prefix: "loc", min: 100 },
});
