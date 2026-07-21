import { expect, test } from "bun:test";
import { assertProviderBinding, assertProviderRoleMatch } from "../src";

test("provider bindings require a role and module", () => {
  expect(() => assertProviderBinding("", { module: "auth" })).toThrow();
  expect(() => assertProviderBinding("auth", null)).toThrow();
  expect(() => assertProviderBinding("auth", {})).toThrow();
  expect(() => assertProviderBinding("auth", { module: "auth" })).not.toThrow();
});

test("marked provider services must match their configured role", () => {
  expect(() => assertProviderRoleMatch("auth", {})).not.toThrow();
  expect(() =>
    assertProviderRoleMatch("auth", { providerRole: "payment" }),
  ).toThrow('marked for "payment"');
});
