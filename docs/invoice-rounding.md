# Debugging invoice deposit rounding

## Problem

The original implementation rounded deposits to whole dollars: a 25% deposit on a $101 invoice returned $25 instead of $25.25. The regression suite also checks empty totals, quantities, decimal sums, full payment and small deposits.

## A test that caught an incomplete fix

The first cents-rounding fix still calculated the percentage in dollar-valued floating-point arithmetic. In the [first hosted run](https://github.com/BhavyaPatel0306/AI-Powered-Invoice-App/actions/runs/40735085215), seven tests passed and the half-cent case failed: a 50% deposit on $19.99 returned $9.99 rather than $10.00.

This failure occurred while developing the fix on a branch; it is not a claim about a customer incident.

## Correction

Convert the invoice total to integer cents before applying the percentage, round the resulting cents to the nearest whole cent, then convert back to dollars. For the failing example: 1,999 cents × 50% = 999.5 cents, rounded to 1,000 cents ($10.00).

The [corrected branch run](https://github.com/BhavyaPatel0306/AI-Powered-Invoice-App/actions/runs/40735218125) passed all eight tests on October 28, 2026. The test remains unchanged to guard against regression.

## Reproduce

Requires Node.js 24. From the repository root:

```sh
node --test tests/invoice-math.test.mjs
```

The tests import the actual calculation helpers in `src/lib/db.ts`; they do not read or write invoice storage and use synthetic data only. Node may emit a module-type detection warning for the existing package layout.

## Scope

This is a targeted arithmetic suite for the prototype, not a financial-system audit. It does not verify payment collection, email delivery, AI intake, browser behavior, authorization or production readiness. Lint and a full application build were not run during this change.
