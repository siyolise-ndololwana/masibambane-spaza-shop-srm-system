import { test } from "node:test";
import { strict as assert } from "node:assert";
import { cvvValid, expiryValid, luhnValid, processFakePayment, validateCard } from "./fake-gateway";

test("accepts the test approval card number", () => {
  assert.equal(luhnValid("4242 4242 4242 4242"), true);
});

test("rejects a card number that fails the checksum", () => {
  assert.equal(luhnValid("4242 4242 4242 4241"), false);
});

test("rejects a past expiry date", () => {
  assert.equal(expiryValid("01/20", new Date("2026-10-24")), false);
});

test("accepts a future expiry date", () => {
  assert.equal(expiryValid("12/28", new Date("2026-10-24")), true);
});

test("rejects a 2-digit security code", () => {
  assert.equal(cvvValid("12"), false);
});

test("rejects a zero amount", async () => {
  const result = await processFakePayment(0, "4242424242424242");
  assert.equal(result.ok, false);
});

test("always declines the test decline card", async () => {
  const result = await processFakePayment(50, "4000 0000 0000 0002");
  assert.equal(result.ok, false);
});

test("approves the test card and returns a reference", async () => {
  const result = await processFakePayment(50, "4242 4242 4242 4242");
  assert.equal(result.ok, true);
  if (result.ok) assert.match(result.reference, /^SIM-/);
});

test("validateCard returns a message for bad input and null for good input", () => {
  assert.ok(validateCard("1234", "12/28", "123"));
  assert.equal(validateCard("4242424242424242", "12/28", "123"), null);
});
