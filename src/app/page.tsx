import Link from "next/link";
import { read, lineItemsTotal, amountDue, clientName } from "@/lib/db";
import { money, shortDate, relTime } from "@/lib/format";
import { AppHeader } from "@/components/AppHeader";
import { StatusPill } from "@/components/StatusPill";

export const dynamic = "force-dynamic";

function avgDaysToPay(invoices: ReturnType<typeof read>["invoices"]): number | null {
  const paid = invoices.filter((i) => i.paidAt && i.sentAt);
  if (paid.length === 0) return null;
  const days =
    paid.reduce((sum, i) => {
      return sum + (new Date(i.paidAt!).getTime() - new Date(i.sentAt!).getTime()) / 86400000;
    }, 0) / paid.length;
  return Math.max(0, Math.round(days * 10) / 10);
}

export default function Dashboard() {
  const s = read();
  const invoices = [...s.invoices].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const outstanding = invoices
    .filter((i) => i.status === "sent")
    .reduce((sum, i) => sum + amountDue(i), 0);

  const now = new Date();
  const paidThisMonth = invoices
    .filter(
      (i) =>
        i.status === "paid" &&
        i.paidAt &&
        new Date(i.paidAt).getMonth() === now.getMonth() &&
        new Date(i.paidAt).getFullYear() === now.getFullYear()
    )
    .reduce((sum, i) => sum + amountDue(i), 0);

  const awaiting = invoices.filter((i) => i.status === "sent").length;
  const avg = avgDaysToPay(invoices);

  const pending = s.projects
    .filter((p) => p.status === "pending")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const pendingValue = pending.reduce((sum, p) => sum + lineItemsTotal(p.workItems), 0);

  return (
    <div className="min-h-full">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-5 pb-24">
        <section className="pt-8 pb-6">
          <p className="text-muted text-sm">Welcome back, {s.settings.ownerName.split(" ")[0]}</p>
          <h1 className="font-display text-3xl sm:text-4xl mt-1 tracking-tight">
            Let&apos;s get you paid.
          </h1>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <div className="card p-5 col-span-2 sm:col-span-1 bg-ink text-bg !border-ink">
            <p className="text-bg/60 text-xs uppercase tracking-[0.14em] font-semibold">Outstanding</p>
            <p className="font-display text-4xl mt-2">{money(outstanding)}</p>
            <p className="text-bg/60 text-sm mt-1">
              {awaiting} invoice{awaiting === 1 ? "" : "s"} awaiting payment
            </p>
          </div>
          <div className="card p-5">
            <p className="label">Collected this month</p>
            <p className="font-display text-2xl mt-1 text-sage">{money(paidThisMonth)}</p>
          </div>
          <div className="card p-5">
            <p className="label">Avg. time to pay</p>
            <p className="font-display text-2xl mt-1">
              {avg === null ? "—" : `${avg} ${avg === 1 ? "day" : "days"}`}
            </p>
          </div>
        </section>

        {pending.length > 0 && (
          <section className="mt-8">
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="font-display text-xl">Pending work</h2>
              <span className="text-muted text-sm">{money(pendingValue)} ready to invoice</span>
            </div>
            <ul className="space-y-2.5">
              {pending.map((p) => {
                const total = lineItemsTotal(p.workItems);
                return (
                  <li key={p.id}>
                    <Link
                      href={`/new?project=${p.id}`}
                      className="card p-4 sm:p-5 flex items-center gap-4 hover:shadow-lg hover:-translate-y-0.5 transition-all border-l-4 !border-l-clay"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2.5">
                          <p className="font-semibold truncate">{clientName(s, p.clientId)}</p>
                          <span className="pill pill-draft">
                            <span className="w-1.5 h-1.5 rounded-full bg-clay" />
                            Not invoiced
                          </span>
                        </div>
                        <p className="text-muted text-sm mt-0.5 truncate">
                          {p.eventType}
                          {p.eventDate ? ` · ${shortDate(p.eventDate)}` : ""} · {p.workItems.length} item
                          {p.workItems.length === 1 ? "" : "s"}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-display text-lg">{money(total)}</p>
                        <p className="text-clay text-xs font-semibold">Create invoice →</p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section className="mt-8">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-display text-xl">Invoices</h2>
            <span className="text-muted text-sm">{invoices.length} total</span>
          </div>

          {invoices.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="text-muted">No invoices yet.</p>
              <Link href="/new" className="btn btn-primary mt-4">
                Create your first invoice
              </Link>
            </div>
          ) : (
            <ul className="space-y-2.5">
              {invoices.map((inv) => {
                const total = lineItemsTotal(inv.lineItems);
                return (
                  <li key={inv.id}>
                    <Link
                      href={`/invoice/${inv.id}`}
                      className="card p-4 sm:p-5 flex items-center gap-4 hover:shadow-lg hover:-translate-y-0.5 transition-all"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2.5">
                          <p className="font-semibold truncate">{inv.client.name}</p>
                          <StatusPill status={inv.status} />
                        </div>
                        <p className="text-muted text-sm mt-0.5 truncate">
                          {inv.eventType} · {inv.number}
                          {inv.status === "sent" && inv.sentAt
                            ? ` · sent ${relTime(inv.sentAt)}`
                            : inv.status === "paid" && inv.paidAt
                            ? ` · paid ${relTime(inv.paidAt)}`
                            : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-lg">{money(total)}</p>
                        <p className="text-muted text-xs">{shortDate(inv.eventDate)}</p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
