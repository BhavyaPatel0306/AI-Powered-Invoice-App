"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { money } from "@/lib/format";
import type { Package, Client, LineItem, Settings, Project } from "@/lib/types";

type ProjectWithClient = Project & { client: Client | null };
type Boot = { settings: Settings; packages: Package[]; clients: Client[]; projects: ProjectWithClient[] };

const EVENT_TYPES = ["Wedding — Full Day", "Wedding — Half Day", "Engagement Session", "Elopement", "Photography"];

export default function NewInvoice() {
  const router = useRouter();
  const [boot, setBoot] = useState<Boot | null>(null);
  const [items, setItems] = useState<LineItem[]>([]);
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [eventType, setEventType] = useState("Wedding — Full Day");
  const [eventDate, setEventDate] = useState("");
  const [notes, setNotes] = useState("");
  const [depositPercent, setDepositPercent] = useState(0);
  const [dueInDays, setDueInDays] = useState(14);
  const [activePkg, setActivePkg] = useState<string[]>([]);
  const [clientId, setClientId] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/bootstrap")
      .then((r) => r.json())
      .then((b: Boot) => {
        setBoot(b);
        setNotes(b.settings.payNote);
        setDepositPercent(b.settings.defaultDepositPercent);
        setDueInDays(b.settings.defaultDueInDays);
        const pid = new URLSearchParams(window.location.search).get("project");
        if (pid) {
          const proj = b.projects.find((p) => p.id === pid);
          if (proj) applyProject(proj, b.settings.defaultDueInDays);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyProject(p: ProjectWithClient, fallbackDue = 14) {
    setProjectId(p.id);
    setClientId(p.clientId);
    setClientName(p.client?.name || "");
    setClientEmail(p.client?.email || "");
    setClientPhone(p.client?.phone || "");
    setEventType(p.eventType || "Photography");
    setEventDate(p.eventDate ? p.eventDate.slice(0, 10) : "");
    setItems(p.workItems.map((li) => ({ ...li })));
    setDepositPercent(p.depositPercent || 0);
    setDueInDays(fallbackDue);
    if (p.notes) setNotes(p.notes);
    setActivePkg([]);
  }

  function applyClient(c: Client) {
    setClientId(c.id);
    setClientName(c.name);
    setClientEmail(c.email || "");
    setClientPhone(c.phone || "");
  }

  function clearSelection() {
    setProjectId(null);
    setClientId(null);
  }

  const total = useMemo(() => items.reduce((s, li) => s + li.qty * li.unitPrice, 0), [items]);
  const due = depositPercent > 0 ? Math.round(total * (depositPercent / 100)) : total;

  function applyPackage(pkg: Package) {
    setActivePkg((prev) =>
      prev.includes(pkg.id) ? prev.filter((p) => p !== pkg.id) : [...prev, pkg.id]
    );
    setItems((prev) => {
      const has = activePkg.includes(pkg.id);
      if (has) {
        // remove this package's items
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

  async function submit(send: boolean) {
    setError("");
    if (!clientName.trim()) return setError("Add the client's name.");
    if (items.filter((i) => i.description.trim()).length === 0)
      return setError("Add at least one line item — tap a package to start.");
    setSaving(true);
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client: { name: clientName, email: clientEmail, phone: clientPhone },
        clientId: clientId || undefined,
        projectId: projectId || undefined,
        eventType,
        eventDate: eventDate || undefined,
        lineItems: items,
        notes,
        depositPercent,
        dueInDays,
        send,
      }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Something went wrong.");
      setSaving(false);
      return;
    }
    const { invoice } = await res.json();
    router.push(`/invoice/${invoice.id}?created=${send ? "sent" : "draft"}`);
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
          <h1 className="font-display text-3xl tracking-tight">New invoice</h1>
          <p className="text-muted mt-1">Tap a package, confirm the client, send. That&apos;s it.</p>
        </div>

        {/* Existing client / pending project */}
        {boot && (boot.projects.length > 0 || boot.clients.length > 0) && (
          <section className="card p-5 mb-7 bg-blush/40 !border-clay/20">
            <p className="label">Start from an existing client or project</p>

            {boot.projects.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {boot.projects.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => applyProject(p, dueInDays)}
                    className={`btn ${projectId === p.id ? "btn-dark" : "btn-ghost"} !px-3.5 !py-2.5 text-left`}
                  >
                    <span className="text-base leading-none">📋</span>
                    <span className="flex flex-col items-start leading-tight">
                      <span className="font-semibold">{p.client?.name || "Client"}</span>
                      <span className="text-xs opacity-70">{p.eventType}</span>
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2">
              <select
                className="input flex-1"
                value={clientId && !projectId ? clientId : ""}
                onChange={(e) => {
                  const c = boot.clients.find((x) => x.id === e.target.value);
                  if (c) applyClient(c);
                }}
              >
                <option value="">Or pick an existing client…</option>
                {boot.clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {(clientId || projectId) && (
                <button
                  onClick={() => {
                    clearSelection();
                    setClientName("");
                    setClientEmail("");
                    setClientPhone("");
                  }}
                  className="btn btn-ghost !py-2.5 shrink-0"
                >
                  Clear
                </button>
              )}
            </div>

            {projectId && (
              <p className="text-clay-deep text-xs mt-2.5 flex items-center gap-1.5">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                Prefilled from saved project — invoicing this will clear it from pending work.
              </p>
            )}
          </section>
        )}

        {/* Packages */}
        <section className="mb-7">
          <p className="label">{items.length > 0 ? "Add more from a package" : "Start from a package"}</p>
          <div className="flex flex-wrap gap-2">
            {boot?.packages.map((pkg) => {
              const on = activePkg.includes(pkg.id);
              return (
                <button
                  key={pkg.id}
                  onClick={() => applyPackage(pkg)}
                  className={`btn ${on ? "btn-dark" : "btn-ghost"} !px-3.5 !py-2.5`}
                >
                  <span className="text-base leading-none">{pkg.emoji}</span>
                  {pkg.name}
                </button>
              );
            })}
            {!boot && <span className="text-muted text-sm">Loading packages…</span>}
          </div>
        </section>

        {/* Client */}
        <section className="card p-5 mb-4">
          <p className="label">Who&apos;s this for?</p>
          <input
            className="input mb-3"
            placeholder="Client name (e.g. Olivia & Daniel)"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
          />
          <div className="grid sm:grid-cols-2 gap-3">
            <input
              className="input"
              placeholder="Email"
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
            />
            <input
              className="input"
              placeholder="Phone (optional)"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
            />
          </div>
        </section>

        {/* Event */}
        <section className="card p-5 mb-4">
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

        {/* Line items */}
        <section className="card p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="label !mb-0">Line items</p>
            <button onClick={addBlank} className="text-clay text-sm font-semibold">
              + Add line
            </button>
          </div>

          {items.length === 0 && (
            <p className="text-muted text-sm py-3">No items yet — tap a package above to fill this in instantly.</p>
          )}

          <div className="space-y-2.5">
            {items.map((li, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  className="input flex-1"
                  placeholder="Description"
                  value={li.description}
                  onChange={(e) => updateItem(i, { description: e.target.value })}
                />
                <input
                  className="input !w-14 text-center"
                  type="number"
                  min={1}
                  value={li.qty}
                  onChange={(e) => updateItem(i, { qty: Number(e.target.value) })}
                  aria-label="Quantity"
                />
                <div className="relative w-28">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">$</span>
                  <input
                    className="input !pl-6 text-right"
                    type="number"
                    min={0}
                    value={li.unitPrice}
                    onChange={(e) => updateItem(i, { unitPrice: Number(e.target.value) })}
                    aria-label="Unit price"
                  />
                </div>
                <button
                  onClick={() => removeItem(i)}
                  className="text-muted hover:text-clay w-8 h-8 grid place-items-center shrink-0"
                  aria-label="Remove line"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Options */}
        <section className="card p-5 mb-4">
          <label className="label">Personal note (shown on the invoice)</label>
          <textarea
            className="input min-h-20 resize-none mb-4"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Collect a deposit?</label>
              <div className="flex gap-2">
                {[0, 25, 50].map((p) => (
                  <button
                    key={p}
                    onClick={() => setDepositPercent(p)}
                    className={`btn flex-1 ${depositPercent === p ? "btn-dark" : "btn-ghost"} !py-2.5`}
                  >
                    {p === 0 ? "Full" : `${p}%`}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label">Due within</label>
              <select
                className="input"
                value={dueInDays}
                onChange={(e) => setDueInDays(Number(e.target.value))}
              >
                {[7, 14, 30].map((d) => (
                  <option key={d} value={d}>
                    {d} days
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {error && (
          <p className="text-clay-deep text-sm bg-blush rounded-xl px-4 py-3 mb-4">{error}</p>
        )}
      </main>

      {/* Sticky action bar */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-bg/90 backdrop-blur-md border-t border-line">
        <div className="mx-auto max-w-2xl px-5 py-3.5 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-muted text-xs">{depositPercent > 0 ? `${depositPercent}% deposit due now` : "Total due"}</p>
            <p className="font-display text-2xl leading-tight">{money(due)}</p>
          </div>
          <button onClick={() => submit(false)} disabled={saving} className="btn btn-ghost">
            Save draft
          </button>
          <button onClick={() => submit(true)} disabled={saving} className="btn btn-primary">
            {saving ? "Sending…" : "Send invoice"}
            {!saving && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
