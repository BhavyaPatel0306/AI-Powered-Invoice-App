import { NextRequest, NextResponse } from "next/server";
import { read, write, id, token } from "@/lib/db";
import { sendInvoiceEmail, emailConfigured, baseUrlFromRequest } from "@/lib/email";
import type { Invoice, LineItem } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const s = read();
  const sorted = [...s.invoices].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return NextResponse.json({ invoices: sorted });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const s = read();

  const items: LineItem[] = (body.lineItems || [])
    .filter((li: LineItem) => li.description?.trim())
    .map((li: LineItem) => ({
      description: li.description.trim(),
      qty: Number(li.qty) || 1,
      unitPrice: Number(li.unitPrice) || 0,
    }));

  if (items.length === 0) {
    return NextResponse.json({ error: "Add at least one line item." }, { status: 400 });
  }
  if (!body.client?.name?.trim()) {
    return NextResponse.json({ error: "Client name is required." }, { status: 400 });
  }

  s.counter += 1;
  const now = new Date().toISOString();
  const sendNow = body.send !== false;

  // Resolve to an existing client when possible (by id or email), else create one.
  const existing =
    (body.clientId && s.clients.find((c) => c.id === body.clientId)) ||
    (body.client.email && s.clients.find((c) => c.email && c.email === body.client.email.trim())) ||
    undefined;

  const client = {
    id: existing ? existing.id : id("cl_"),
    name: body.client.name.trim(),
    email: (body.client.email || existing?.email || "").trim(),
    phone: (body.client.phone || existing?.phone || "").trim() || undefined,
  };

  const invoice: Invoice = {
    id: id("inv_"),
    number: `INV-${s.counter}`,
    publicId: token(),
    client,
    eventType: (body.eventType || "Photography").trim(),
    eventDate: body.eventDate || undefined,
    lineItems: items,
    notes: (body.notes || "").trim(),
    depositPercent: Number(body.depositPercent) || 0,
    status: sendNow ? "sent" : "draft",
    createdAt: now,
    sentAt: sendNow ? now : undefined,
    dueInDays: Number(body.dueInDays) || s.settings.defaultDueInDays,
    events: [
      { type: "created", at: now },
      ...(sendNow ? [{ type: "sent" as const, at: now }] : []),
    ],
  };

  s.invoices.push(invoice);
  const known = s.clients.find((c) => c.id === client.id);
  if (known) {
    known.name = client.name;
    if (client.email) known.email = client.email;
    if (client.phone) known.phone = client.phone;
  } else {
    s.clients.push(client);
  }

  // If generated from a saved project, mark it invoiced and link them.
  if (body.projectId) {
    const project = s.projects.find((p) => p.id === body.projectId);
    if (project) {
      project.status = "invoiced";
      project.invoiceId = invoice.id;
    }
  }

  let emailSent = false;
  let emailError: string | undefined;
  if (sendNow && client.email && emailConfigured()) {
    const result = await sendInvoiceEmail({
      invoice,
      settings: s.settings,
      baseUrl: baseUrlFromRequest(req),
    });
    if (result.ok) {
      emailSent = true;
      invoice.events.push({ type: "sent", at: new Date().toISOString(), note: `Emailed to ${client.email}` });
    } else {
      emailError = result.error;
    }
  }

  write(s);

  return NextResponse.json(
    { invoice, emailSent, emailConfigured: emailConfigured(), emailError },
    { status: 201 }
  );
}
