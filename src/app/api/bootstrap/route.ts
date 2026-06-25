import { NextResponse } from "next/server";
import { read } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const s = read();
  const pendingProjects = s.projects
    .filter((p) => p.status === "pending")
    .map((p) => ({ ...p, client: s.clients.find((c) => c.id === p.clientId) || null }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return NextResponse.json({
    settings: s.settings,
    packages: s.packages,
    clients: [...s.clients].sort((a, b) => a.name.localeCompare(b.name)),
    projects: pendingProjects,
  });
}
