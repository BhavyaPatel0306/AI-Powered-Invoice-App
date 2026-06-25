export type LineItem = {
  description: string;
  qty: number;
  unitPrice: number; // in dollars
};

export type Package = {
  id: string;
  name: string;
  emoji: string;
  lineItems: LineItem[];
};

export type Client = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  notes?: string;
};

export type ProjectStatus = "pending" | "invoiced";

export type Project = {
  id: string;
  clientId: string;
  title: string;
  eventType: string;
  eventDate?: string;
  workItems: LineItem[];
  notes?: string;
  depositPercent: number;
  status: ProjectStatus;
  invoiceId?: string;
  createdAt: string;
};

export type InvoiceStatus = "draft" | "sent" | "paid";

export type InvoiceEvent = {
  type: "created" | "sent" | "viewed" | "reminded" | "paid";
  at: string; // ISO
  note?: string;
};

export type Invoice = {
  id: string;
  number: string; // e.g. INV-1042
  publicId: string; // token for the public pay link
  client: Client;
  eventType: string;
  eventDate?: string; // ISO date of the wedding/shoot
  lineItems: LineItem[];
  notes?: string;
  depositPercent: number; // 0 = pay in full
  status: InvoiceStatus;
  createdAt: string;
  sentAt?: string;
  paidAt?: string;
  dueInDays: number;
  events: InvoiceEvent[];
};

export type Settings = {
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  accentInitials: string;
  defaultDepositPercent: number;
  defaultDueInDays: number;
  payNote: string;
};

export type Store = {
  settings: Settings;
  packages: Package[];
  clients: Client[];
  projects: Project[];
  invoices: Invoice[];
  counter: number;
};
