import { makeItemHandlers } from "@/lib/airtable/route-handlers";
import { openRoleFromAirtable, openRoleToAirtable } from "@/lib/airtable/mappers";
import { TABLE_NAMES } from "@/lib/airtable/field-names";
import { openRoleSchema } from "@/lib/airtable/schemas";

export const { PATCH } = makeItemHandlers(TABLE_NAMES.OpenRoles, openRoleFromAirtable, openRoleToAirtable, {
  schema: openRoleSchema,
});
