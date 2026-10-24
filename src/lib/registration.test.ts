import { test } from "node:test";
import { strict as assert } from "node:assert";
import { validatePasswordConfirmation } from "./registration";

test("registration requires matching password confirmation", () => {
  assert.equal(validatePasswordConfirmation("ShopPassword12", "different"), "Passwords do not match.");
  assert.equal(validatePasswordConfirmation("ShopPassword12", "ShopPassword12"), null);
});