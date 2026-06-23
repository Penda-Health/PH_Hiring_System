import { makeCollectionHandlers } from "@/lib/airtable/route-handlers";
import { candidateFromAirtable, candidateToAirtable } from "@/lib/airtable/mappers";
import { TABLE_NAMES, F } from "@/lib/airtable/field-names";
import { candidateSchema } from "@/lib/airtable/schemas";

export const { GET, POST } = makeCollectionHandlers(
  TABLE_NAMES.Candidates,
  candidateFromAirtable,
  candidateToAirtable,
  { schema: candidateSchema, genId: { airtableField: F.Candidates.CAND_ID, prefix: "CAND", pad: 3 } }
);
