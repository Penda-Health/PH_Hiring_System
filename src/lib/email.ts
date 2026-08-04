// Email sending via Resend. All outbound email goes through this module.
// Set RESEND_API_KEY and RESEND_FROM_EMAIL in environment variables.
// RESEND_FROM_EMAIL should be a verified domain address, e.g. "hiring@penda.co.ke"
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.RESEND_FROM_EMAIL ?? "Penda Hiring <hiring@penda.co.ke>";
const REPLY_TO = "ta@penda.co.ke";

function formatDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-KE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ── BM notification: candidate has booked ────────────────────────────────────

export async function sendBmWorkTrialNotification(params: {
  bmEmail: string;
  bmName: string;
  branchName: string;
  candidateName: string;
  candidatePhone: string;
  candidateEmail: string;
  date: string;
  scoringLink: string;
}) {
  if (!process.env.RESEND_API_KEY) return; // gracefully skip in local dev without key
  const { bmEmail, bmName, branchName, candidateName, candidatePhone, candidateEmail, date, scoringLink } = params;
  await resend.emails.send({
    from: FROM,
    to: bmEmail,
    replyTo: REPLY_TO,
    subject: `Work Trial scheduled — ${candidateName} at ${branchName} on ${formatDate(date)}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
        <div style="background:#00897b;padding:20px 24px;border-radius:8px 8px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:20px;">Work Trial Scheduled</h1>
        </div>
        <div style="background:#f9f9f9;padding:24px;border:1px solid #e5e5e5;border-top:none;">
          <p>Hi ${bmName},</p>
          <p>A candidate has selected a work trial date at your branch.</p>

          <table style="width:100%;border-collapse:collapse;margin:16px 0;">
            <tr><td style="padding:8px 12px;background:#fff;border:1px solid #e5e5e5;font-weight:600;width:40%;">Candidate</td><td style="padding:8px 12px;background:#fff;border:1px solid #e5e5e5;">${candidateName}</td></tr>
            <tr><td style="padding:8px 12px;background:#f5f5f5;border:1px solid #e5e5e5;font-weight:600;">Phone</td><td style="padding:8px 12px;background:#f5f5f5;border:1px solid #e5e5e5;">${candidatePhone}</td></tr>
            <tr><td style="padding:8px 12px;background:#fff;border:1px solid #e5e5e5;font-weight:600;">Email</td><td style="padding:8px 12px;background:#fff;border:1px solid #e5e5e5;">${candidateEmail}</td></tr>
            <tr><td style="padding:8px 12px;background:#f5f5f5;border:1px solid #e5e5e5;font-weight:600;">Branch</td><td style="padding:8px 12px;background:#f5f5f5;border:1px solid #e5e5e5;">${branchName}</td></tr>
            <tr><td style="padding:8px 12px;background:#fff;border:1px solid #e5e5e5;font-weight:600;">Date</td><td style="padding:8px 12px;background:#fff;border:1px solid #e5e5e5;color:#00897b;font-weight:600;">${formatDate(date)}</td></tr>
          </table>

          <p style="margin:20px 0;">After the work trial, please use the link below to submit your assessment:</p>
          <div style="text-align:center;margin:20px 0;">
            <a href="${scoringLink}" style="display:inline-block;background:#00897b;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;">
              Submit Work Trial Assessment
            </a>
          </div>
          <p style="color:#666;font-size:13px;">If you cannot proceed with this candidate's work trial, reply to this email and cc ta@penda.co.ke.</p>
        </div>
        <div style="padding:12px 24px;text-align:center;color:#999;font-size:12px;">
          Penda Health Hiring System · <a href="mailto:ta@penda.co.ke" style="color:#00897b;">ta@penda.co.ke</a>
        </div>
      </div>
    `,
  });
}

// ── Candidate confirmation ────────────────────────────────────────────────────

export async function sendCandidateWorkTrialConfirmation(params: {
  candidateEmail: string;
  candidateName: string;
  branchName: string;
  branchAddress: string;
  mapPinUrl: string;
  bmName: string;
  bmPhone: string;
  date: string;
}) {
  if (!process.env.RESEND_API_KEY) return;
  const { candidateEmail, candidateName, branchName, branchAddress, mapPinUrl, bmName, bmPhone, date } = params;
  await resend.emails.send({
    from: FROM,
    to: candidateEmail,
    replyTo: REPLY_TO,
    subject: `Your Penda Health Work Trial — ${formatDate(date)}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
        <div style="background:#00897b;padding:20px 24px;border-radius:8px 8px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:20px;">Work Trial Confirmed ✓</h1>
        </div>
        <div style="background:#f9f9f9;padding:24px;border:1px solid #e5e5e5;border-top:none;">
          <p>Hi ${candidateName},</p>
          <p>Your work trial at Penda Health has been confirmed. Here are your details:</p>

          <div style="background:#fff;border:1px solid #e5e5e5;border-radius:6px;padding:16px 20px;margin:16px 0;">
            <p style="margin:0 0 8px;font-size:18px;font-weight:700;color:#00897b;">${formatDate(date)}</p>
            <p style="margin:0 0 4px;font-weight:600;">${branchName}</p>
            ${branchAddress ? `<p style="margin:0;color:#555;font-size:14px;">${branchAddress.replace(/\n/g, "<br>")}</p>` : ""}
          </div>

          ${mapPinUrl ? `
          <div style="text-align:center;margin:20px 0;">
            <a href="${mapPinUrl}" style="display:inline-block;background:#1a73e8;color:#fff;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">
              📍 Open in Google Maps
            </a>
          </div>` : ""}

          <div style="background:#e8f5e9;border:1px solid #c8e6c9;border-radius:6px;padding:12px 16px;margin:16px 0;">
            <p style="margin:0 0 4px;font-weight:600;">Your supervisor</p>
            <p style="margin:0;color:#1b5e20;">${bmName}${bmPhone ? ` · ${bmPhone}` : ""}</p>
          </div>

          <ul style="color:#333;font-size:14px;line-height:1.8;">
            <li>Please arrive on time — the work trial usually runs for one full day.</li>
            <li>Bring a valid national ID or passport.</li>
            <li>Dress professionally and bring a pen.</li>
            <li>The trial is a paid opportunity — you will receive payment on the day.</li>
          </ul>

          <p>If you need to make changes or have questions, please contact:<br>
          <a href="mailto:ta@penda.co.ke" style="color:#00897b;">ta@penda.co.ke</a></p>
        </div>
        <div style="padding:12px 24px;text-align:center;color:#999;font-size:12px;">
          Penda Health Hiring System · <a href="mailto:ta@penda.co.ke" style="color:#00897b;">ta@penda.co.ke</a>
        </div>
      </div>
    `,
  });
}

// ── BM score reminder ─────────────────────────────────────────────────────────

export async function sendBmScoreReminder(params: {
  bmEmail: string;
  bmName: string;
  branchName: string;
  candidateName: string;
  date: string;
  scoringLink: string;
  reminderNumber: 1 | 2; // 1 = next-day, 2 = 36h
}) {
  if (!process.env.RESEND_API_KEY) return;
  const { bmEmail, bmName, branchName, candidateName, date, scoringLink, reminderNumber } = params;
  const urgency = reminderNumber === 1 ? "a friendly reminder" : "a final reminder";
  await resend.emails.send({
    from: FROM,
    to: bmEmail,
    replyTo: REPLY_TO,
    subject: `[Reminder ${reminderNumber}/2] Work trial assessment pending — ${candidateName} at ${branchName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#1a1a1a;">
        <div style="background:#e65100;padding:20px 24px;border-radius:8px 8px 0 0;">
          <h1 style="color:#fff;margin:0;font-size:20px;">Assessment Pending — ${urgency}</h1>
        </div>
        <div style="background:#f9f9f9;padding:24px;border:1px solid #e5e5e5;border-top:none;">
          <p>Hi ${bmName},</p>
          <p>The work trial assessment for <strong>${candidateName}</strong> (${formatDate(date)} at ${branchName}) has not yet been submitted.</p>
          <p>Please take a few minutes to complete the assessment now:</p>
          <div style="text-align:center;margin:20px 0;">
            <a href="${scoringLink}" style="display:inline-block;background:#e65100;color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:15px;">
              Submit Assessment Now
            </a>
          </div>
          <p style="color:#666;font-size:13px;">If the candidate did not attend, please use the form to mark them as "Did Not Attend" — this closes the record.</p>
          <p style="color:#666;font-size:13px;">Questions? Reply to this email or contact ta@penda.co.ke.</p>
        </div>
        <div style="padding:12px 24px;text-align:center;color:#999;font-size:12px;">
          Penda Health Hiring System · <a href="mailto:ta@penda.co.ke" style="color:#00897b;">ta@penda.co.ke</a>
        </div>
      </div>
    `,
  });
}
