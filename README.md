# FlintFramePro — get paid faster

Invoicing built for photographers who are always in the field. Matt finishes a
shoot, taps a saved package, confirms the couple, and sends a beautiful invoice
with a secure **Pay Now** link — in under 30 seconds, from his phone. No more
waiting until he's back at the desk days later.

## Why this gets Matt paid faster

1. **Seconds to send.** Saved packages (Wedding Full Day, Engagement, Elopement…)
   pre-fill the line items. Pick → confirm client → send.
2. **One-tap online payment.** Clients open a branded link and pay by card
   immediately — no bank transfers, no "I'll mail a check."
3. **Deposits up front.** Collect a 25%/50% deposit the moment the invoice goes out.
4. **It nudges itself.** See when a client opened the invoice and send a reminder
   in one tap.
5. **Send from anywhere.** Email or text the link straight from the field.

## Run it

```bash
npm install
npm run dev
# open http://localhost:3000
```

Demo data (Matt Lane Photography + sample invoices) is seeded automatically on
first run into `.data/store.json`. Delete that file to reset to a clean slate.

## Flow to try

1. **Dashboard** (`/`) — outstanding balance, collected this month, avg. time to pay.
2. **New invoice** (`/new`) — tap a package, add the client, hit *Send invoice*.
3. **Share** — copy the secure link or send by email/text; watch the activity timeline.
4. **Client view** (`/pay/<id>`) — what the couple sees; pay by card → 🎉 confetti.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 with a custom editorial theme (Fraunces + Inter)
- Zero-config JSON file persistence (`src/lib/db.ts`) — no database to set up

> `patch-os.js` is a tiny dev shim that makes `os.networkInterfaces()` fail safe
> inside restricted sandboxes; it's harmless everywhere else.
