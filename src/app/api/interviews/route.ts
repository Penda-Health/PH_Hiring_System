import { makeCollectionHandlers } from "@/lib/airtable/route-handlers";
import { interviewFromAirtable, interviewToAirtable } from "@/lib/airtable/mappers";
import { TABLE_NAMES, F } from "@/lib/airtable/field-names";
import { interviewSchema } from "@/lib/airtable/schemas";

export const { GET, POST } = makeCollectionHandlers(
  TABLE_NAMES.Interviews,
  interviewFromAirtable,
  interviewToAirtable,
  { schema: interviewSchema, genId: { airtableField: F.Interviews.SCHED_ID, prefix: "SCH", pad: 3 } }
);
