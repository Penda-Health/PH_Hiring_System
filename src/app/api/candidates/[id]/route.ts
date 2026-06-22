import { makeItemHandlers } from "@/lib/airtable/route-handlers";
import { candidateFromAirtable, candidateToAirtable } from "@/lib/airtable/mappers";
import { TABLE_NAMES } from "@/lib/airtable/field-names";

export const { PATCH } = makeItemHandlers(
  TABLE_NAMES.Candidates,
  candidateFromAirtable,
  candidateToAirtable
);
