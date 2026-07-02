import { makeCollectionHandlers } from "@/lib/airtable/route-handlers";
import { newEmployeeFromAirtable, newEmployeeToAirtable } from "@/lib/airtable/mappers";
import { TABLE_NAMES, F } from "@/lib/airtable/field-names";
import { newEmployeeSchema } from "@/lib/airtable/schemas";

export const { GET, POST } = makeCollectionHandlers(
  TABLE_NAMES.NewEmployees,
  newEmployeeFromAirtable,
  newEmployeeToAirtable,
  { schema: newEmployeeSchema, genId: { airtableField: F.NewEmployees.EMPLOYEE_ID, prefix: "EMP", pad: 3 } }
);
