import { makeCollectionHandlers } from "@/lib/airtable/route-handlers";
import { requisitionFromAirtable, requisitionToAirtable } from "@/lib/airtable/mappers";
import { TABLE_NAMES } from "@/lib/airtable/field-names";

export const { GET, POST } = makeCollectionHandlers(
  TABLE_NAMES.Requisitions,
  requisitionFromAirtable,
  requisitionToAirtable
);
