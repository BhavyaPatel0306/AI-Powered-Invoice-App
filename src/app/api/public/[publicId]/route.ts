import { NextRequest, NextResponse } from "next/server";
import { read, write, amountDue, lineItemsTotal } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await ctx.params;
  const s = read();
  const inv = s.invoices.find((i) => i.publicId === publicId);
  if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Log a view (only once per session-ish: if last event isn't a view today)
  const last = inv.events[inv.events.length - 1];
  if (inv.status !== "paid" && (!last || last.type !== "viewed")) {
    inv.events.push({ type: "viewed", at: new Date().toISOString() });
    write(s);
  }

  return NextResponse.json({
    invoice: inv,
    business: s.settings,
    total: lineItemsTotal(inv.lineItems),
    due: amountDue(inv),
  });
}
