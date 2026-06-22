import { makeCollectionHandlers } from "@/lib/airtable/route-handlers";
import { branchFromAirtable, branchToAirtable } from "@/lib/airtable/mappers";
import { TABLE_NAMES } from "@/lib/airtable/field-names";

export const { GET, POST } = makeCollectionHandlers(
  TABLE_NAMES.Branches,
  branchFromAirtable,
  branchToAirtable
);
