import { describe, expect, it } from "vitest";
import { cvvValid, expiryValid, luhnValid, processFakePayment, validateCard } from "./fake-gateway";

describe("fake gateway card validation", () => {
  it("accepts the test approval card number", () => {
    expect(luhnValid("4242 4242 4242 4242")).toBe(true);
  });

  it("rejects a card number that fails the checksum", () => {
    expect(luhnValid("4242 4242 4242 4241")).toBe(false);
  });

  it("rejects a past expiry date", () => {
    expect(expiryValid("01/20", new Date("2026-10-24"))).toBe(false);
  });

  it("accepts a future expiry date", () => {
    expect(expiryValid("12/28", new Date("2026-10-24"))).toBe(true);
  });

  it("rejects a 2-digit security code", () => {
    expect(cvvValid("12")).toBe(false);
  });

  it("rejects a zero or negative amount", async () => {
    const result = await processFakePayment(0, "4242424242424242");
    expect(result.ok).toBe(false);
  });

  it("always declines the test decline card", async () => {
    const result = await processFakePayment(50, "4000 0000 0000 0002");
    expect(result.ok).toBe(false);
  });

  it("approves the test card and returns a reference", async () => {
    const result = await processFakePayment(50, "4242 4242 4242 4242");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.reference).toMatch(/^SIM-/);
  });

  it("validateCard returns a message for bad input and null for good input", () => {
    expect(validateCard("1234", "12/28", "123")).toBeTruthy();
    expect(validateCard("4242424242424242", "12/28", "123")).toBeNull();
  });
});
