# FlintFramePro — Voice-Assisted Invoice Prototype

**Next.js · React · TypeScript · OpenAI · JSON persistence**

A photography invoicing prototype that brings client intake, saved packages, invoice creation and a client-facing invoice view into one workflow. This repository is named `AI-Powered-Invoice-App`; the application is branded **FlintFramePro**.

**Demo scope:** payments are simulated. The payment endpoint updates the invoice status in local storage; it does not charge a card, transfer money, or verify a transaction. Use synthetic client data only.

## What it demonstrates

- Saved photography packages and invoice line items.
- Client details, invoice activity and dashboard summaries.
- Voice transcription and AI-assisted conversion of spoken intake into form fields.
- A shareable client invoice view and simulated payment completion.
- Optional invoice email delivery through Resend.

## Run locally

```sh
git clone https://github.com/BhavyaPatel0306/AI-Powered-Invoice-App.git
cd AI-Powered-Invoice-App
npm ci
npm run dev
```

Open http://localhost:3000. Use a Node.js version compatible with the committed Next.js 16 dependency.

Demo data for the fictional Matt Lane Photography business is seeded into `.data/store.json`. Back up that file before resetting demo data.

## Optional integrations

Copy `.env.example` to `.env.local` and configure only the integrations you want to try:

- `OPENAI_API_KEY`: enables voice transcription and structured intake. Audio and intake text are sent to OpenAI; provider usage may incur charges.
- `RESEND_API_KEY`: enables real email delivery. Use your own test recipient and follow Resend's sender restrictions.
- `EMAIL_FROM`: optional verified email sender.
- `APP_URL`: optional base URL used in invoice email links.

Keep keys server-side and never commit local environment files. Without provider credentials, the relevant integrations are unavailable; the basic local invoice demo does not require them.

## Two-minute walkthrough

1. Open the dashboard and inspect the seeded sample invoices.
2. Create an invoice using a saved package and synthetic client details.
3. If OpenAI is configured, try dictation and review the resulting form values before continuing.
4. Open the client view at `/pay/<publicId>`.
5. Try the simulated payment flow and inspect the updated invoice status. No payment is collected.

## How the AI works

[`src/app/api/transcribe/route.ts`](src/app/api/transcribe/route.ts) sends audio to the transcription API.
[`src/app/api/intake/route.ts`](src/app/api/intake/route.ts) converts transcripts into structured fields such as client details, package selections and dates.

Review generated values before using them. Model output can be incorrect; no extraction-accuracy benchmark is claimed.

## Architecture and tradeoffs

- **UI and routes:** Next.js App Router with React and TypeScript.
- **Presentation:** Tailwind CSS with a custom theme.
- **Persistence:** [`src/lib/db.ts`](src/lib/db.ts) stores local JSON data rather than using a database.
- **Email:** [`src/lib/email.ts`](src/lib/email.ts) integrates with Resend.
- **Demo payment:** the public payment route marks an invoice paid locally.

Local JSON storage keeps the prototype easy to explore, but is not a substitute for transactional storage or a multi-user production service.

## Verification and limitations

```sh
npm run lint
npm run build
```

These are the available project checks, not a claim that they were rerun for this documentation update. This repository currently has no automated test suite or GitHub Actions workflow.

This is a local portfolio prototype, not a production billing system. Payment-related interface wording represents a demo workflow; no payment gateway, verified settlement, or secure production payment claim is made. No measured time-to-invoice or revenue improvement is claimed.

Next steps are to label simulated payments throughout the interface, add tests for invoice calculations and intake failures, and evaluate authentication and persistence before considering public deployment.
