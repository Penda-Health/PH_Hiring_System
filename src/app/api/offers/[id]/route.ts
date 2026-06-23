import { makeItemHandlers } from "@/lib/airtable/route-handlers";
import { offerFromAirtable, offerToAirtable } from "@/lib/airtable/mappers";
import { TABLE_NAMES } from "@/lib/airtable/field-names";
import { offerSchema } from "@/lib/airtable/schemas";

export const { PATCH } = makeItemHandlers(TABLE_NAMES.Offers, offerFromAirtable, offerToAirtable, {
  schema: offerSchema,
});
