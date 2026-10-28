import test from "node:test";
import assert from "node:assert/strict";
import { lineItemsTotal, amountDue } from "../src/lib/db.ts";

const items = (price, qty = 1) => [{ description: "Synthetic test item", unitPrice: price, qty }];
const invoice = (price, depositPercent) => ({ lineItems: items(price), depositPercent });

test("empty invoice total is zero", () => assert.equal(lineItemsTotal([]), 0));
test("quantities contribute to invoice total", () => assert.equal(lineItemsTotal(items(12.99, 3)), 38.97));
test("decimal prices produce a cents-rounded total", () => {
  assert.equal(lineItemsTotal([...items(0.1), ...items(0.2)]), 0.3);
});
test("zero-percent deposit requests the full total", () => assert.equal(amountDue(invoice(99.99, 0)), 99.99));
test("25-percent deposit retains cents", () => assert.equal(amountDue(invoice(101, 25)), 25.25));
test("50-percent deposit rounds half a cent up", () => assert.equal(amountDue(invoice(19.99, 50)), 10));
test("small deposits are not rounded to whole dollars", () => assert.equal(amountDue(invoice(1, 25)), 0.25));
test("zero-value invoice has no deposit due", () => assert.equal(amountDue(invoice(0, 50)), 0));
