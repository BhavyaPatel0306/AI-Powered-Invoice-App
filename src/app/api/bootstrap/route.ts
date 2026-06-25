import { NextResponse } from "next/server";
import { read } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const s = read();
  return NextResponse.json({
    settings: s.settings,
    packages: s.packages,
    clients: s.clients,
  });
}
