"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Invoice } from "@/lib/types";

export function InvoiceActions({
  invoice,
  createdState,
}: {
  invoice: Invoice;
  createdState?: string;
}) {
  const router = useRouter();
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => setOrigin(window.location.origin), []);
  const link = `${origin}/pay/${invoice.publicId}`;

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2600);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      flash("Couldn't copy — long-press the link to copy.");
    }
  }

  async function act(action: string, msg: string) {
    setBusy(action);
    await fetch(`/api/invoices/${invoice.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setBusy(null);
    flash(msg);
    router.refresh();
  }

  async function sendEmail(reminder: boolean) {
    if (!invoice.client.email) {
      flash("This client has no email address on file.");
      return;
    }
    setBusy(reminder ? "remind" : "email");
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reminder }),
      });
      const d = await res.json().catch(() => ({}));
      if (d.ok) {
        flash(reminder ? `Reminder emailed to ${invoice.client.email} ✓` : `Emailed to ${invoice.client.email} ✓`);
        router.refresh();
      } else if (d.configured === false) {
        flash("Add a RESEND_API_KEY to send real emails.");
      } else {
        flash(d.error || "Couldn't send the email.");
      }
    } catch {
      flash("Couldn't reach the email service.");
    } finally {
      setBusy(null);
    }
  }

  const smsBody = encodeURIComponent(`Hi! Here's your invoice — view & pay securely: ${link}`);
  const sms = `sms:${invoice.client.phone || ""}?&body=${smsBody}`;

  const isPaid = invoice.status === "paid";

  return (
    <div className="space-y-4">
      {createdState && (
        <div className="card p-5 bg-ink text-bg !border-ink animate-pop">
          <p className="font-display text-xl">
            {createdState === "sent" ? "Invoice sent! 🎉" : "Draft saved."}
          </p>
          <p className="text-bg/70 text-sm mt-1">
            {createdState === "sent"
              ? "Share the secure link below so they can pay in two taps."
              : "Send it whenever you're ready."}
          </p>
        </div>
      )}

      {/* Share link */}
      <div className="card p-5">
        <p className="label">Secure payment link</p>
        <div className="flex items-center gap-2">
          <input readOnly value={link} className="input flex-1 text-sm !py-2.5 text-muted" />
          <button onClick={copy} className="btn btn-dark !py-2.5 shrink-0">
            {copied ? "Copied ✓" : "Copy"}
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3">
          <button
            onClick={() => sendEmail(false)}
            disabled={busy !== null || !invoice.client.email}
            className="btn btn-primary"
            title={invoice.client.email ? `Email ${invoice.client.email}` : "No client email on file"}
          >
            {busy === "email" ? (
              <>
                <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                Sending…
              </>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="4" width="20" height="16" rx="2" />
                  <path d="m22 7-10 5L2 7" />
                </svg>
                Send by email
              </>
            )}
          </button>
          <a href={sms} onClick={() => act("send", "Opened text message.")} className="btn btn-ghost">
            Send by text
          </a>
        </div>
        {!invoice.client.email && (
          <p className="text-muted text-xs mt-2">Add a client email to send the invoice by email.</p>
        )}
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          className="block text-center text-clay text-sm font-semibold mt-3 hover:underline"
        >
          Preview what your client sees ↗
        </a>
      </div>

      {/* Status actions */}
      <div className="grid grid-cols-2 gap-2">
        {!isPaid ? (
          <>
            <button
              onClick={() => sendEmail(true)}
              disabled={busy !== null}
              className="btn btn-ghost"
            >
              {busy === "remind" ? "Sending…" : "Send reminder"}
            </button>
            <button
              onClick={() => act("markPaid", "Marked as paid ✓")}
              disabled={busy !== null}
              className="btn btn-dark"
            >
              {busy === "markPaid" ? "Saving…" : "Mark as paid"}
            </button>
          </>
        ) : (
          <button
            onClick={() => act("unmarkPaid", "Reopened invoice.")}
            disabled={busy !== null}
            className="btn btn-ghost col-span-2"
          >
            Reopen invoice
          </button>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 bg-ink text-bg text-sm px-4 py-2.5 rounded-full shadow-lg animate-pop">
          {toast}
        </div>
      )}
    </div>
  );
}
