import { makeCollectionHandlers } from "@/lib/airtable/route-handlers";
import { relieverFromAirtable, relieverToAirtable } from "@/lib/airtable/mappers";
import { TABLE_NAMES, F } from "@/lib/airtable/field-names";
import { relieverSchema } from "@/lib/airtable/schemas";

export const { GET, POST } = makeCollectionHandlers(
  TABLE_NAMES.Relievers,
  relieverFromAirtable,
  relieverToAirtable,
  { schema: relieverSchema, genId: { airtableField: F.Relievers.RELIEVER_ID, prefix: "rel", min: 100 } }
);
