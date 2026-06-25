import { Resend } from "resend";
import type { Invoice, Settings } from "./types";
import { money } from "./format";
import { amountDue, lineItemsTotal } from "./db";

export function emailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

export function baseUrlFromRequest(req: Request): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") || (host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https");
  return `${proto}://${host}`;
}

function renderEmail(opts: {
  invoice: Invoice;
  settings: Settings;
  link: string;
  reminder: boolean;
}): string {
  const { invoice, settings, link, reminder } = opts;
  const due = amountDue(invoice);
  const total = lineItemsTotal(invoice.lineItems);
  const first = invoice.client.name.split(" ")[0] || "there";

  const rows = invoice.lineItems
    .map(
      (li) => `
      <tr>
        <td style="padding:8px 0;color:#1d1a16;font-size:14px;border-bottom:1px solid #efe9df;">
          ${li.description}${li.qty > 1 ? ` &times; ${li.qty}` : ""}
        </td>
        <td style="padding:8px 0;color:#1d1a16;font-size:14px;text-align:right;border-bottom:1px solid #efe9df;white-space:nowrap;">
          ${money(li.qty * li.unitPrice)}
        </td>
      </tr>`
    )
    .join("");

  const intro = reminder
    ? `Just a friendly reminder about your invoice below — whenever you have a moment, you can view and pay it securely online.`
    : `Thank you so much! Here's your invoice. You can view everything and pay securely online in just a couple of taps.`;

  return `<!doctype html>
<html>
  <body style="margin:0;background:#f6f2ec;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1d1a16;">
    <div style="max-width:560px;margin:0 auto;padding:28px 18px;">
      <div style="text-align:center;padding:8px 0 18px;">
        <div style="font-size:20px;font-weight:700;letter-spacing:-0.01em;">${settings.businessName}</div>
        <div style="font-size:12px;color:#7c736a;text-transform:uppercase;letter-spacing:0.14em;margin-top:4px;">Invoice ${invoice.number}</div>
      </div>

      <div style="background:#fffdfa;border:1px solid #e8e1d6;border-radius:18px;padding:26px;">
        <p style="margin:0 0 14px;font-size:15px;line-height:1.5;">Hi ${first},</p>
        <p style="margin:0 0 20px;font-size:15px;line-height:1.5;color:#54504a;">${intro}</p>

        <div style="text-align:center;background:#1d1a16;border-radius:14px;padding:20px;margin-bottom:20px;">
          <div style="color:rgba(246,242,236,0.6);font-size:12px;text-transform:uppercase;letter-spacing:0.12em;">${invoice.depositPercent > 0 ? `Deposit due (${invoice.depositPercent}%)` : "Amount due"}</div>
          <div style="color:#fffdfa;font-size:34px;font-weight:700;margin-top:6px;">${money(due)}</div>
          <div style="color:rgba(246,242,236,0.6);font-size:13px;margin-top:4px;">${invoice.eventType}</div>
        </div>

        <a href="${link}" style="display:block;text-align:center;background:#bd5c3a;color:#ffffff;text-decoration:none;font-weight:600;font-size:16px;padding:15px;border-radius:999px;">
          View &amp; pay securely
        </a>

        <table style="width:100%;border-collapse:collapse;margin-top:24px;">
          ${rows}
          <tr>
            <td style="padding:12px 0 0;font-weight:600;font-size:15px;">Total</td>
            <td style="padding:12px 0 0;font-weight:600;font-size:15px;text-align:right;">${money(total)}</td>
          </tr>
        </table>

        ${
          invoice.notes
            ? `<p style="margin:20px 0 0;font-size:13px;font-style:italic;color:#7c736a;background:#f4e7df;border-radius:12px;padding:14px;">&ldquo;${invoice.notes}&rdquo;</p>`
            : ""
        }
      </div>

      <p style="text-align:center;color:#7c736a;font-size:12px;margin-top:18px;">
        Questions? Just reply to this email — ${settings.email}
      </p>
      <p style="text-align:center;color:#b3aa9e;font-size:11px;margin-top:6px;">Sent with FlintFramePro</p>
    </div>
  </body>
</html>`;
}

export type SendResult =
  | { ok: true; id?: string }
  | { ok: false; configured: boolean; error: string };

export async function sendInvoiceEmail(opts: {
  invoice: Invoice;
  settings: Settings;
  baseUrl: string;
  reminder?: boolean;
}): Promise<SendResult> {
  const { invoice, settings, baseUrl, reminder = false } = opts;

  if (!process.env.RESEND_API_KEY) {
    return { ok: false, configured: false, error: "RESEND_API_KEY is not set." };
  }
  if (!invoice.client.email) {
    return { ok: false, configured: true, error: "This client has no email address." };
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.EMAIL_FROM || `${settings.businessName} <onboarding@resend.dev>`;
  const link = `${baseUrl}/pay/${invoice.publicId}`;
  const subject = reminder
    ? `Reminder: invoice ${invoice.number} from ${settings.businessName}`
    : `Your invoice from ${settings.businessName} — ${invoice.number}`;

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: invoice.client.email,
      replyTo: settings.email,
      subject,
      html: renderEmail({ invoice, settings, link, reminder }),
    });
    if (error) return { ok: false, configured: true, error: error.message };
    return { ok: true, id: data?.id };
  } catch (e) {
    return { ok: false, configured: true, error: e instanceof Error ? e.message : "Failed to send email." };
  }
}
