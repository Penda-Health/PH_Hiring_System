import { makeItemHandlers } from "@/lib/airtable/route-handlers";
import { branchFromAirtable, branchToAirtable } from "@/lib/airtable/mappers";
import { TABLE_NAMES } from "@/lib/airtable/field-names";

export const { PATCH } = makeItemHandlers(TABLE_NAMES.Branches, branchFromAirtable, branchToAirtable);
