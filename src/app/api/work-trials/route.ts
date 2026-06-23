import { makeCollectionHandlers } from "@/lib/airtable/route-handlers";
import { workTrialFromAirtable, workTrialToAirtable } from "@/lib/airtable/mappers";
import { TABLE_NAMES } from "@/lib/airtable/field-names";
import { workTrialSchema } from "@/lib/airtable/schemas";

export const { GET, POST } = makeCollectionHandlers(
  TABLE_NAMES.WorkTrials,
  workTrialFromAirtable,
  workTrialToAirtable,
  { schema: workTrialSchema }
);
