// Netlify scheduled function: posts the IPS weekly open-roles summary every
// Monday at 09:00 Nairobi time (06:00 UTC). The work itself lives in the
// Next.js route so it shares the app's Airtable and Google Chat code; this
// just triggers it. Needs CRON_SECRET set in the site's environment.
export default async function handler() {
  const base = process.env.URL;
  const secret = process.env.CRON_SECRET;
  if (!base || !secret) {
    console.error("[ips-weekly-summary] URL or CRON_SECRET is not set");
    return;
  }
  const res = await fetch(`${base}/api/cron/ips-weekly-summary`, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
  });
  console.log("[ips-weekly-summary]", res.status, await res.text().catch(() => ""));
}

export const config = { schedule: "0 6 * * 1" };
