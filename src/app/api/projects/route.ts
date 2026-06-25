import { NextRequest, NextResponse } from "next/server";
import { read, write, id } from "@/lib/db";
import type { Project, LineItem, Client } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const s = read();
  const sorted = [...s.projects].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const withClient = sorted.map((p) => ({
    ...p,
    client: s.clients.find((c) => c.id === p.clientId) || null,
  }));
  return NextResponse.json({ projects: withClient });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const s = read();

  const items: LineItem[] = (body.workItems || [])
    .filter((li: LineItem) => li.description?.trim())
    .map((li: LineItem) => ({
      description: li.description.trim(),
      qty: Number(li.qty) || 1,
      unitPrice: Number(li.unitPrice) || 0,
    }));

  if (!body.client?.name?.trim()) {
    return NextResponse.json({ error: "Client name is required." }, { status: 400 });
  }

  // Reuse existing client if an id is passed and matches, otherwise create one.
  let client: Client | undefined = body.client.id
    ? s.clients.find((c) => c.id === body.client.id)
    : undefined;

  if (client) {
    client.name = body.client.name.trim();
    client.email = (body.client.email || client.email || "").trim();
    if (body.client.phone) client.phone = body.client.phone.trim();
    if (body.client.notes) client.notes = body.client.notes.trim();
  } else {
    client = {
      id: id("cl_"),
      name: body.client.name.trim(),
      email: (body.client.email || "").trim(),
      phone: (body.client.phone || "").trim() || undefined,
      notes: (body.client.notes || "").trim() || undefined,
    };
    s.clients.push(client);
  }

  const project: Project = {
    id: id("prj_"),
    clientId: client.id,
    title: (body.title || `${client.name} — ${body.eventType || "Project"}`).trim(),
    eventType: (body.eventType || "Photography").trim(),
    eventDate: body.eventDate || undefined,
    workItems: items,
    notes: (body.notes || "").trim(),
    depositPercent: Number(body.depositPercent) || 0,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  s.projects.push(project);
  write(s);

  return NextResponse.json({ project, client }, { status: 201 });
}
