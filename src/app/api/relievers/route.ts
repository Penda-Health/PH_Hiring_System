import { makeCollectionHandlers } from "@/lib/airtable/route-handlers";
import { relieverFromAirtable, relieverToAirtable } from "@/lib/airtable/mappers";
import { TABLE_NAMES } from "@/lib/airtable/field-names";

export const { GET, POST } = makeCollectionHandlers(
  TABLE_NAMES.Relievers,
  relieverFromAirtable,
  relieverToAirtable
);
