// Server-only data access for the public, no-login 6-month employment
// confirmation form. Record-bound (unlike the requisition-request forms) —
// follows the same load-by-token-id / single-use-guard pattern as
// work-trial-form.ts.
import { getRecord, updateRecord } from "@/lib/airtable/client";
import { TABLE_NAMES, F } from "@/lib/airtable/field-names";
import { newEmployeeFromAirtable } from "@/lib/airtable/mappers";

export type ConfirmEmploymentFormData = {
  employeeName: string;
  role: string;
  startDate: string;
  alreadySubmitted: boolean;
};

export async function loadConfirmEmploymentFormData(newEmployeeId: string): Promise<ConfirmEmploymentFormData | null> {
  const record = await getRecord(TABLE_NAMES.NewEmployees, newEmployeeId);
  if (!record) return null;
  const employee = newEmployeeFromAirtable(record);

  return {
    employeeName: employee.name,
    role: employee.role,
    startDate: employee.startDate,
    alreadySubmitted: Boolean(employee.confirmation6mo) && employee.confirmation6mo !== "Pending",
  };
}

export async function submitEmploymentConfirmation(
  newEmployeeId: string,
  confirmed: boolean
): Promise<void> {
  await updateRecord(TABLE_NAMES.NewEmployees, newEmployeeId, {
    [F.NewEmployees.CONFIRMATION_6MO]: confirmed ? "Confirmed" : "Not Confirmed",
    [F.NewEmployees.CONFIRMATION_6MO_AT]: new Date().toISOString(),
  });
}
