import { expect, test } from "bun:test";
import { validatePasswordConfirmation } from "./registration";

test("registration requires matching password confirmation", () => {
  expect(validatePasswordConfirmation("ShopPassword12", "different")).toBe("Passwords do not match.");
  expect(validatePasswordConfirmation("ShopPassword12", "ShopPassword12")).toBeNull();
});