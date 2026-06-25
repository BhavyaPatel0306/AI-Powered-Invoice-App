import { NextRequest, NextResponse } from "next/server";
import { read, write } from "@/lib/db";
import type { InvoiceEvent } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const s = read();
  const inv = s.invoices.find((i) => i.id === id);
  if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ invoice: inv });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const body = await req.json();
  const s = read();
  const inv = s.invoices.find((i) => i.id === id);
  if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const now = new Date().toISOString();
  const action = body.action as string;

  if (action === "send") {
    inv.status = inv.status === "paid" ? "paid" : "sent";
    inv.sentAt = inv.sentAt || now;
    inv.events.push({ type: "sent", at: now });
  } else if (action === "remind") {
    inv.events.push({ type: "reminded", at: now });
  } else if (action === "markPaid") {
    inv.status = "paid";
    inv.paidAt = inv.paidAt || now;
    inv.events.push({ type: "paid", at: now, note: "Marked paid manually" });
  } else if (action === "unmarkPaid") {
    inv.status = inv.sentAt ? "sent" : "draft";
    inv.paidAt = undefined;
    inv.events = inv.events.filter((e: InvoiceEvent) => e.type !== "paid");
  }

  write(s);
  return NextResponse.json({ invoice: inv });
}
