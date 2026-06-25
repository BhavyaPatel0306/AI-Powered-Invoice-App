import { NextRequest, NextResponse } from "next/server";
import { read, write } from "@/lib/db";
import { sendInvoiceEmail, baseUrlFromRequest } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const reminder = !!body.reminder;

  const s = read();
  const inv = s.invoices.find((i) => i.id === id);
  if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const result = await sendInvoiceEmail({
    invoice: inv,
    settings: s.settings,
    baseUrl: baseUrlFromRequest(req),
    reminder,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, configured: result.configured, error: result.error },
      { status: result.configured ? 502 : 200 }
    );
  }

  const now = new Date().toISOString();
  if (reminder) {
    inv.events.push({ type: "reminded", at: now, note: `Reminder emailed to ${inv.client.email}` });
  } else {
    if (inv.status === "draft") inv.status = "sent";
    inv.sentAt = inv.sentAt || now;
    inv.events.push({ type: "sent", at: now, note: `Emailed to ${inv.client.email}` });
  }
  write(s);

  return NextResponse.json({ ok: true, id: result.id, invoice: inv });
}
