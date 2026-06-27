import { makeCollectionHandlers } from "@/lib/airtable/route-handlers";
import { openRoleFromAirtable, openRoleToAirtable } from "@/lib/airtable/mappers";
import { TABLE_NAMES, F } from "@/lib/airtable/field-names";
import { openRoleSchema } from "@/lib/airtable/schemas";
import { OpenRole } from "@/types";

export const { GET, POST } = makeCollectionHandlers(
  TABLE_NAMES.OpenRoles,
  openRoleFromAirtable,
  openRoleToAirtable,
  {
    schema: openRoleSchema,
    genId: {
      airtableField: F.OpenRoles.ROLE_ID,
      prefix: (body: Partial<OpenRole>) => (body.segment === "SO" ? "SO" : "IPS"),
      pad: 3,
    },
  }
);
