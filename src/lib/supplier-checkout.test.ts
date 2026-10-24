import { test } from "node:test";
import { strict as assert } from "node:assert";
import { validateSupplierCheckoutUrl } from "./supplier-checkout";

test("supplier checkout keeps the supplier payment page and order reference", () => {
  assert.equal(validateSupplierCheckoutUrl(" https://supplier.example/pay?order=123 "), "https://supplier.example/pay?order=123");
});

test("supplier checkout rejects unsafe links and embedded credentials", () => {
  for (const value of ["javascript:alert(1)", "http://supplier.example/pay", "https://user:password@supplier.example", "not a link", "https://supplier.example/a b"]) {
    assert.throws(() => validateSupplierCheckoutUrl(value));
  }
});

test("a supplier checkout link can be removed", () => {
  assert.equal(validateSupplierCheckoutUrl("  "), null);
});