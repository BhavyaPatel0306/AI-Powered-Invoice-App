"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { money } from "@/lib/format";
import type { Package, LineItem, Settings } from "@/lib/types";

type Boot = { settings: Settings; packages: Package[] };

const EVENT_TYPES = ["Wedding — Full Day", "Wedding — Half Day", "Engagement Session", "Elopement", "Photography"];

export default function NewClientProject() {
  const router = useRouter();
  const [boot, setBoot] = useState<Boot | null>(null);
  const [items, setItems] = useState<LineItem[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [clientNotes, setClientNotes] = useState("");
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState("Wedding — Full Day");
  const [eventDate, setEventDate] = useState("");
  const [notes, setNotes] = useState("");
  const [depositPercent, setDepositPercent] = useState(0);
  const [activePkg, setActivePkg] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/bootstrap")
      .then((r) => r.json())
      .then((b: Boot) => setBoot(b));
  }, []);

  const total = useMemo(() => items.reduce((s, li) => s + li.qty * li.unitPrice, 0), [items]);

  function applyPackage(pkg: Package) {
    setActivePkg((prev) => (prev.includes(pkg.id) ? prev.filter((p) => p !== pkg.id) : [...prev, pkg.id]));
    setItems((prev) => {
      const has = activePkg.includes(pkg.id);
      if (has) {
        const descs = new Set(pkg.lineItems.map((li) => li.description));
        return prev.filter((li) => !descs.has(li.description));
      }
      const existing = new Set(prev.map((li) => li.description));
      const toAdd = pkg.lineItems.filter((li) => !existing.has(li.description));
      return [...prev, ...toAdd.map((li) => ({ ...li }))];
    });
  }

  function updateItem(i: number, patch: Partial<LineItem>) {
    setItems((prev) => prev.map((li, idx) => (idx === i ? { ...li, ...patch } : li)));
  }
  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }
  function addBlank() {
    setItems((prev) => [...prev, { description: "", qty: 1, unitPrice: 0 }]);
  }

  async function submit() {
    setError("");
    if (!name.trim()) return setError("Add the client's name.");
    setSaving(true);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client: { name, email, phone, notes: clientNotes },
        title: title.trim() || undefined,
        eventType,
        eventDate: eventDate || undefined,
        workItems: items,
        notes,
        depositPercent,
      }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Something went wrong.");
      setSaving(false);
      return;
    }
    router.push("/?added=client");
  }

  return (
    <div className="min-h-full pb-40">
      <header className="sticky top-0 z-30 backdrop-blur-md bg-bg/80 border-b border-line">
        <div className="mx-auto max-w-2xl px-5 h-16 flex items-center justify-between">
          <Logo subtle />
          <Link href="/" className="text-muted text-sm hover:text-ink">
            Cancel
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5">
        <div className="pt-7 pb-5">
          <h1 className="font-display text-3xl tracking-tight">New client &amp; project</h1>
          <p className="text-muted mt-1">
            Capture the booking now — the work, the costs, the details. Invoice it whenever you&apos;re ready.
          </p>
        </div>

        {/* Client */}
        <section className="card p-5 mb-4">
          <p className="label">Client</p>
          <input
            className="input mb-3"
            placeholder="Client name (e.g. Sofia & James)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="grid sm:grid-cols-2 gap-3">
            <input className="input" placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className="input" placeholder="Phone (optional)" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <textarea
            className="input min-h-16 resize-none mt-3"
            placeholder="Notes about the client (optional)"
            value={clientNotes}
            onChange={(e) => setClientNotes(e.target.value)}
          />
        </section>

        {/* Project */}
        <section className="card p-5 mb-4">
          <p className="label">Project</p>
          <input
            className="input mb-3"
            placeholder="Project title (optional, e.g. Vineyard Wedding)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Event type</label>
              <select className="input" value={eventType} onChange={(e) => setEventType(e.target.value)}>
                {EVENT_TYPES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Event date</label>
              <input className="input" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </div>
          </div>
        </section>

        {/* Packages */}
        <section className="mb-4">
          <p className="label">Add work from a package</p>
          <div className="flex flex-wrap gap-2">
            {boot?.packages.map((pkg) => {
              const on = activePkg.includes(pkg.id);
              return (
                <button key={pkg.id} onClick={() => applyPackage(pkg)} className={`btn ${on ? "btn-dark" : "btn-ghost"} !px-3.5 !py-2.5`}>
                  <span className="text-base leading-none">{pkg.emoji}</span>
                  {pkg.name}
                </button>
              );
            })}
            {!boot && <span className="text-muted text-sm">Loading…</span>}
          </div>
        </section>

        {/* Work items */}
        <section className="card p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="label !mb-0">Work &amp; costs</p>
            <button onClick={addBlank} className="text-clay text-sm font-semibold">
              + Add line
            </button>
          </div>
          {items.length === 0 && (
            <p className="text-muted text-sm py-3">No work yet — tap a package above or add a line.</p>
          )}
          <div className="space-y-2.5">
            {items.map((li, i) => (
              <div key={i} className="flex items-center gap-2">
                <input className="input flex-1" placeholder="Description" value={li.description} onChange={(e) => updateItem(i, { description: e.target.value })} />
                <input className="input !w-14 text-center" type="number" min={1} value={li.qty} onChange={(e) => updateItem(i, { qty: Number(e.target.value) })} aria-label="Quantity" />
                <div className="relative w-28">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">$</span>
                  <input className="input !pl-6 text-right" type="number" min={0} value={li.unitPrice} onChange={(e) => updateItem(i, { unitPrice: Number(e.target.value) })} aria-label="Unit price" />
                </div>
                <button onClick={() => removeItem(i)} className="text-muted hover:text-clay w-8 h-8 grid place-items-center shrink-0" aria-label="Remove line">
                  ✕
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Options */}
        <section className="card p-5 mb-4">
          <label className="label">Project notes (carried onto the invoice)</label>
          <textarea className="input min-h-20 resize-none mb-4" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything to remember about this shoot…" />
          <label className="label">Planned deposit</label>
          <div className="flex gap-2 max-w-xs">
            {[0, 25, 50].map((p) => (
              <button key={p} onClick={() => setDepositPercent(p)} className={`btn flex-1 ${depositPercent === p ? "btn-dark" : "btn-ghost"} !py-2.5`}>
                {p === 0 ? "Full" : `${p}%`}
              </button>
            ))}
          </div>
        </section>

        {error && <p className="text-clay-deep text-sm bg-blush rounded-xl px-4 py-3 mb-4">{error}</p>}
      </main>

      <div className="fixed bottom-0 inset-x-0 z-30 bg-bg/90 backdrop-blur-md border-t border-line">
        <div className="mx-auto max-w-2xl px-5 py-3.5 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-muted text-xs">Project value</p>
            <p className="font-display text-2xl leading-tight">{money(total)}</p>
          </div>
          <button onClick={submit} disabled={saving} className="btn btn-primary">
            {saving ? "Saving…" : "Save client & project"}
          </button>
        </div>
      </div>
    </div>
  );
}
