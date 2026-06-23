import { makeItemHandlers } from "@/lib/airtable/route-handlers";
import { requisitionFromAirtable, requisitionToAirtable } from "@/lib/airtable/mappers";
import { TABLE_NAMES } from "@/lib/airtable/field-names";
import { requisitionSchema } from "@/lib/airtable/schemas";

export const { PATCH } = makeItemHandlers(
  TABLE_NAMES.Requisitions,
  requisitionFromAirtable,
  requisitionToAirtable,
  { schema: requisitionSchema }
);
