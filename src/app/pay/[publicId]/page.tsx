"use client";

import { useEffect, useState, use } from "react";
import { money, shortDate } from "@/lib/format";
import { Confetti } from "@/components/Confetti";
import type { Invoice, Settings } from "@/lib/types";

type Data = { invoice: Invoice; business: Settings; total: number; due: number };

export default function PayPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = use(params);
  const [data, setData] = useState<Data | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [stage, setStage] = useState<"idle" | "processing" | "paid">("idle");
  const [showPay, setShowPay] = useState(false);

  useEffect(() => {
    fetch(`/api/public/${publicId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Data) => {
        setData(d);
        if (d.invoice.status === "paid") setStage("paid");
      })
      .catch(() => setNotFound(true));
  }, [publicId]);

  async function pay() {
    setStage("processing");
    await new Promise((r) => setTimeout(r, 1500));
    const res = await fetch(`/api/public/${publicId}/pay`, { method: "POST" });
    const d = await res.json();
    setData((prev) => (prev ? { ...prev, invoice: d.invoice } : prev));
    setShowPay(false);
    setStage("paid");
  }

  if (notFound) {
    return (
      <div className="min-h-screen grid place-items-center px-5">
        <p className="text-muted">This invoice link is no longer available.</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="w-8 h-8 rounded-full border-2 border-line border-t-clay animate-spin" />
      </div>
    );
  }

  const { invoice: inv, business, total, due } = data;
  const paid = stage === "paid";

  return (
    <div className="min-h-screen">
      {paid && <Confetti />}

      {/* Branded header */}
      <div className="bg-ink text-bg">
        <div className="mx-auto max-w-xl px-6 pt-10 pb-8 text-center">
          <div className="inline-grid place-items-center w-12 h-12 rounded-2xl bg-bg/10 border border-bg/20 font-display text-lg mx-auto">
            {business.accentInitials}
          </div>
          <h1 className="font-display text-2xl mt-3">{business.businessName}</h1>
          <p className="text-bg/60 text-sm mt-1">Invoice {inv.number} · Demo only</p>
        </div>
      </div>

      <main className="mx-auto max-w-xl px-6 -mt-5 pb-16">
        <div className="card p-6 sm:p-8 animate-pop">
          {paid ? (
            <div className="text-center py-2">
              <div className="inline-grid place-items-center w-16 h-16 rounded-full bg-[#e4efe8] text-sage mb-3">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
              <h2 className="font-display text-2xl">Simulated payment complete</h2>
              <p className="text-muted mt-1">
                Demo completed for {inv.client.name.split(" ")[0]}. No money was collected and no receipt was sent.
              </p>
              <p className="font-display text-4xl mt-5">{money(due)}</p>
              <p className="text-muted text-sm mt-1">Demo amount for {business.businessName}</p>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-muted text-sm">Billed to</p>
                  <p className="font-semibold text-lg">{inv.client.name}</p>
                  <p className="text-muted text-sm mt-0.5">
                    {inv.eventType}
                    {inv.eventDate ? ` · ${shortDate(inv.eventDate)}` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-muted text-sm">Due</p>
                  <p className="font-display text-3xl leading-tight">{money(due)}</p>
                </div>
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
                    <span>Deposit due now ({inv.depositPercent}%)</span>
                    <span className="tabular-nums">{money(due)}</span>
                  </div>
                )}
              </div>

              {inv.notes && (
                <p className="mt-5 text-sm text-muted bg-blush/60 rounded-xl p-4 italic">“{inv.notes}”</p>
              )}

              <button onClick={() => setShowPay(true)} className="btn btn-primary w-full !py-3.5 mt-6 text-base">
                Preview demo payment of {money(due)}
              </button>
              <p className="text-center text-muted text-xs mt-3 flex items-center justify-center gap-1.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                Simulated checkout · no money is collected
              </p>
            </>
          )}
        </div>

        {!paid && (
          <p className="text-center text-muted text-xs mt-6">
            Questions? Reply to {business.email}
          </p>
        )}
      </main>

      {/* Payment sheet */}
      {showPay && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
            onClick={() => stage !== "processing" && setShowPay(false)}
          />
          <div className="relative card w-full sm:max-w-md m-0 sm:m-5 rounded-t-3xl sm:rounded-3xl p-6 animate-pop">
            <p className="label">Simulate payment of {money(due)}</p>
            <div className="space-y-3 mt-1">
              <div>
                <label className="label">Sample card number (not editable)</label>
                <input readOnly aria-label="Sample card number" className="input" placeholder="4242 4242 4242 4242" defaultValue="4242 4242 4242 4242" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Expiry</label>
                  <input readOnly aria-label="Sample expiry" className="input" placeholder="MM/YY" defaultValue="12/28" />
                </div>
                <div>
                  <label className="label">CVC</label>
                  <input readOnly aria-label="Sample security code" className="input" placeholder="123" defaultValue="123" />
                </div>
              </div>
            </div>
            <button onClick={pay} disabled={stage === "processing"} className="btn btn-primary w-full !py-3.5 mt-5">
              {stage === "processing" ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  Simulating…
                </>
              ) : (
                `Simulate ${money(due)} payment`
              )}
            </button>
            <p className="text-center text-muted text-xs mt-3">Demo checkout only. Do not enter real card details. No charge is made.</p>
          </div>
        </div>
      )}
    </div>
  );
}
