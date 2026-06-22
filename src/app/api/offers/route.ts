import { makeCollectionHandlers } from "@/lib/airtable/route-handlers";
import { offerFromAirtable, offerToAirtable } from "@/lib/airtable/mappers";
import { TABLE_NAMES } from "@/lib/airtable/field-names";

export const { GET, POST } = makeCollectionHandlers(TABLE_NAMES.Offers, offerFromAirtable, offerToAirtable);
