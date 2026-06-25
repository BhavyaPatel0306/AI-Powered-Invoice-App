import fs from "fs";
import path from "path";
import crypto from "crypto";
import type { Store, Invoice, LineItem } from "./types";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "store.json");

export function id(prefix = ""): string {
  return prefix + crypto.randomBytes(6).toString("hex");
}

export function token(): string {
  return crypto.randomBytes(12).toString("hex");
}

function seed(): Store {
  const now = Date.now();
  const day = 86400000;
  const iso = (offsetDays: number) => new Date(now + offsetDays * day).toISOString();

  const invoices: Invoice[] = [
    {
      id: id("inv_"),
      number: "INV-1043",
      publicId: token(),
      client: { id: id("cl_"), name: "Olivia & Daniel Reyes", email: "olivia.reyes@example.com", phone: "+1 415 555 0142" },
      eventType: "Wedding — Full Day",
      eventDate: iso(-6),
      lineItems: [
        { description: "Full-day wedding coverage (10 hrs)", qty: 1, unitPrice: 3800 },
        { description: "Second shooter", qty: 1, unitPrice: 650 },
        { description: "Engagement session", qty: 1, unitPrice: 450 },
      ],
      notes: "Thank you both — it was an honor to capture your day. Gallery delivered within 6 weeks.",
      depositPercent: 0,
      status: "sent",
      createdAt: iso(-2),
      sentAt: iso(-2),
      dueInDays: 14,
      events: [
        { type: "created", at: iso(-2) },
        { type: "sent", at: iso(-2) },
        { type: "viewed", at: iso(-1) },
      ],
    },
    {
      id: id("inv_"),
      number: "INV-1042",
      publicId: token(),
      client: { id: id("cl_"), name: "Priya & Marcus Bell", email: "priyabell@example.com" },
      eventType: "Engagement Session",
      eventDate: iso(-12),
      lineItems: [
        { description: "Engagement session (2 hrs)", qty: 1, unitPrice: 450 },
        { description: "Premium retouching add-on", qty: 1, unitPrice: 120 },
      ],
      notes: "So fun shooting at the coast! Let me know if you'd like prints.",
      depositPercent: 0,
      status: "paid",
      createdAt: iso(-10),
      sentAt: iso(-10),
      paidAt: iso(-8),
      dueInDays: 14,
      events: [
        { type: "created", at: iso(-10) },
        { type: "sent", at: iso(-10) },
        { type: "viewed", at: iso(-9) },
        { type: "paid", at: iso(-8) },
      ],
    },
    {
      id: id("inv_"),
      number: "INV-1041",
      publicId: token(),
      client: { id: id("cl_"), name: "The Hartleys", email: "hartley.events@example.com" },
      eventType: "Wedding — Full Day",
      eventDate: iso(-28),
      lineItems: [
        { description: "Full-day wedding coverage (10 hrs)", qty: 1, unitPrice: 3800 },
        { description: "Second shooter", qty: 1, unitPrice: 650 },
        { description: "Fine-art album (30 spreads)", qty: 1, unitPrice: 900 },
      ],
      notes: "",
      depositPercent: 0,
      status: "paid",
      createdAt: iso(-25),
      sentAt: iso(-25),
      paidAt: iso(-20),
      dueInDays: 14,
      events: [
        { type: "created", at: iso(-25) },
        { type: "sent", at: iso(-25) },
        { type: "paid", at: iso(-20) },
      ],
    },
  ];

  return {
    counter: 1043,
    settings: {
      businessName: "Matt Lane Photography",
      ownerName: "Matt Lane",
      email: "matt@mattlanephoto.com",
      phone: "+1 415 555 0110",
      accentInitials: "ML",
      defaultDepositPercent: 0,
      defaultDueInDays: 14,
      payNote: "Payment secures your gallery delivery. Thank you for trusting me with your day.",
    },
    packages: [
      {
        id: id("pkg_"),
        name: "Wedding — Full Day",
        emoji: "💍",
        lineItems: [
          { description: "Full-day wedding coverage (10 hrs)", qty: 1, unitPrice: 3800 },
          { description: "Second shooter", qty: 1, unitPrice: 650 },
        ],
      },
      {
        id: id("pkg_"),
        name: "Wedding — Half Day",
        emoji: "🤍",
        lineItems: [{ description: "Half-day wedding coverage (6 hrs)", qty: 1, unitPrice: 2400 }],
      },
      {
        id: id("pkg_"),
        name: "Engagement Session",
        emoji: "💕",
        lineItems: [{ description: "Engagement session (2 hrs)", qty: 1, unitPrice: 450 }],
      },
      {
        id: id("pkg_"),
        name: "Elopement",
        emoji: "🌿",
        lineItems: [{ description: "Elopement coverage (4 hrs)", qty: 1, unitPrice: 1600 }],
      },
      {
        id: id("pkg_"),
        name: "Album Add-on",
        emoji: "📖",
        lineItems: [{ description: "Fine-art album (30 spreads)", qty: 1, unitPrice: 900 }],
      },
    ],
    clients: invoices.map((i) => i.client),
    invoices,
  };
}

function ensure(): Store {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    const s = seed();
    fs.writeFileSync(DATA_FILE, JSON.stringify(s, null, 2));
    return s;
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8")) as Store;
}

export function read(): Store {
  return ensure();
}

export function write(store: Store): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
}

export function lineItemsTotal(items: LineItem[]): number {
  return items.reduce((sum, li) => sum + li.qty * li.unitPrice, 0);
}

export function amountDue(inv: Invoice): number {
  const total = lineItemsTotal(inv.lineItems);
  if (inv.depositPercent > 0) return Math.round(total * (inv.depositPercent / 100));
  return total;
}
