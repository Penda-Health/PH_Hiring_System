import { makeCollectionHandlers } from "@/lib/airtable/route-handlers";
import { staffingProjectionFromAirtable, staffingProjectionToAirtable } from "@/lib/airtable/mappers";
import { TABLE_NAMES } from "@/lib/airtable/field-names";
import { staffingProjectionSchema } from "@/lib/airtable/schemas";

export const { GET, POST } = makeCollectionHandlers(
  TABLE_NAMES.StaffingProjections,
  staffingProjectionFromAirtable,
  staffingProjectionToAirtable,
  { schema: staffingProjectionSchema }
);
