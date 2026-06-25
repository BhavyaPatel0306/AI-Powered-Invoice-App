import { NextRequest, NextResponse } from "next/server";
import { read, write } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await ctx.params;
  const s = read();
  const inv = s.invoices.find((i) => i.publicId === publicId);
  if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (inv.status !== "paid") {
    const now = new Date().toISOString();
    inv.status = "paid";
    inv.paidAt = now;
    inv.events.push({ type: "paid", at: now, note: "Paid online via card" });
    write(s);
  }

  return NextResponse.json({ invoice: inv });
}
