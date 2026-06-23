import { makeItemHandlers } from "@/lib/airtable/route-handlers";
import { relieverFromAirtable, relieverToAirtable } from "@/lib/airtable/mappers";
import { TABLE_NAMES } from "@/lib/airtable/field-names";
import { relieverSchema } from "@/lib/airtable/schemas";

export const { PATCH } = makeItemHandlers(
  TABLE_NAMES.Relievers,
  relieverFromAirtable,
  relieverToAirtable,
  { schema: relieverSchema }
);
