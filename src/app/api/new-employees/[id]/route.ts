import { makeItemHandlers } from "@/lib/airtable/route-handlers";
import { newEmployeeFromAirtable, newEmployeeToAirtable } from "@/lib/airtable/mappers";
import { TABLE_NAMES } from "@/lib/airtable/field-names";
import { newEmployeeSchema } from "@/lib/airtable/schemas";

export const { PATCH } = makeItemHandlers(
  TABLE_NAMES.NewEmployees,
  newEmployeeFromAirtable,
  newEmployeeToAirtable,
  { schema: newEmployeeSchema }
);
