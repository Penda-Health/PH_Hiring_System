import { makeItemHandlers } from "@/lib/airtable/route-handlers";
import { requisitionFromAirtable, requisitionToAirtable } from "@/lib/airtable/mappers";
import { TABLE_NAMES } from "@/lib/airtable/field-names";
import { requisitionPatchSchema } from "@/lib/airtable/schemas";

// Ordinary field edits only — approval state can't be patched here (see
// requisitionPatchSchema); it moves through ./decision instead.
export const { PATCH } = makeItemHandlers(
  TABLE_NAMES.Requisitions,
  requisitionFromAirtable,
  requisitionToAirtable,
  { schema: requisitionPatchSchema }
);
