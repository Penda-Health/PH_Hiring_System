// Server-only. Never import this from a "use client" component — the API
// key must never reach the browser.

export function getAirtableConfig() {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_BASE_ID;
  if (!apiKey || !baseId) {
    throw new Error("Missing AIRTABLE_API_KEY or AIRTABLE_BASE_ID environment variables.");
  }
  return { apiKey, baseId, baseUrl: `https://api.airtable.com/v0/${baseId}` };
}
