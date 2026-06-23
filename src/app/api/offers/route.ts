import { makeCollectionHandlers } from "@/lib/airtable/route-handlers";
import { offerFromAirtable, offerToAirtable } from "@/lib/airtable/mappers";
import { TABLE_NAMES } from "@/lib/airtable/field-names";
import { offerSchema } from "@/lib/airtable/schemas";

export const { GET, POST } = makeCollectionHandlers(TABLE_NAMES.Offers, offerFromAirtable, offerToAirtable, {
  schema: offerSchema,
});
