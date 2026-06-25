import Link from "next/link";
import { notFound } from "next/navigation";
import { read, lineItemsTotal, amountDue } from "@/lib/db";
import { money, shortDate, relTime } from "@/lib/format";
import { AppHeader } from "@/components/AppHeader";
import { StatusPill } from "@/components/StatusPill";
import { InvoiceActions } from "@/components/InvoiceActions";
import type { InvoiceEvent } from "@/lib/types";

export const dynamic = "force-dynamic";

const EVENT_LABEL: Record<InvoiceEvent["type"], string> = {
  created: "Invoice created",
  sent: "Sent to client",
  viewed: "Client opened the invoice",
  reminded: "Reminder sent",
  paid: "Payment received",
};

export default async function InvoiceDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const { created } = await searchParams;
  const s = read();
  const inv = s.invoices.find((i) => i.id === id);
  if (!inv) notFound();

  const total = lineItemsTotal(inv.lineItems);
  const due = amountDue(inv);
  const events = [...inv.events].reverse();

  return (
    <div className="min-h-full">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-5 pb-24">
        <Link href="/" className="inline-flex items-center gap-1.5 text-muted text-sm mt-6 hover:text-ink">
          ← All invoices
        </Link>

        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 mt-4">
          {/* Invoice card */}
          <div>
            <div className="card overflow-hidden">
              <div className="p-6 sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-muted text-sm">{inv.number}</p>
                    <h1 className="font-display text-2xl sm:text-3xl mt-1 tracking-tight">
                      {inv.client.name}
                    </h1>
                    <p className="text-muted mt-1">
                      {inv.eventType}
                      {inv.eventDate ? ` · ${shortDate(inv.eventDate)}` : ""}
                    </p>
                  </div>
                  <StatusPill status={inv.status} />
                </div>

                <div className="mt-6 border-t border-line pt-4 space-y-3">
                  {inv.lineItems.map((li, i) => (
                    <div key={i} className="flex items-baseline justify-between gap-4">
                      <p className="text-sm">
                        {li.description}
                        {li.qty > 1 && <span className="text-muted"> × {li.qty}</span>}
                      </p>
                      <p className="text-sm tabular-nums shrink-0">{money(li.qty * li.unitPrice)}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 border-t border-line pt-4 space-y-1.5">
                  <div className="flex justify-between text-sm text-muted">
                    <span>Total</span>
                    <span className="tabular-nums">{money(total)}</span>
                  </div>
                  {inv.depositPercent > 0 && (
                    <div className="flex justify-between text-sm text-muted">
                      <span>Deposit ({inv.depositPercent}%)</span>
                      <span className="tabular-nums">{money(due)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-baseline pt-1">
                    <span className="font-semibold">Due now</span>
                    <span className="font-display text-2xl">{money(due)}</span>
                  </div>
                </div>

                {inv.notes && (
                  <p className="mt-5 text-sm text-muted bg-blush/60 rounded-xl p-4 italic">
                    “{inv.notes}”
                  </p>
                )}
              </div>
            </div>

            {/* Timeline */}
            <div className="card p-6 mt-4">
              <p className="label">Activity</p>
              <ol className="space-y-3 mt-1">
                {events.map((e, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${
                        e.type === "paid" ? "bg-sage" : e.type === "viewed" ? "bg-clay" : "bg-line"
                      }`}
                    />
                    <span className="text-sm flex-1">{EVENT_LABEL[e.type]}</span>
                    <span className="text-muted text-xs">{relTime(e.at)}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {/* Actions */}
          <div className="lg:sticky lg:top-20 self-start">
            <InvoiceActions invoice={inv} createdState={created} />
          </div>
        </div>
      </main>
    </div>
  );
}
