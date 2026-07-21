import { describe, expect, test } from "bun:test";
import {
  assertAuthProvider,
  isApiKeyPrincipal,
  isApiKeyRecord,
  isAuthPrincipal,
  isIssuedApiKey,
} from "../src";

const ordinaryService = {
  authenticate: async () => null,
  getPrincipal: async () => null,
  issueApiKey: async () => ({
    id: "key",
    subjectId: "user",
    label: "automation",
    secret: "secret",
    prefix: "dm_",
    scopes: [],
    createdAt: new Date(),
  }),
  getApiKey: async () => null,
  listApiKeys: async () => [],
  verifyApiKey: async () => null,
  revokeApiKey: async () => undefined,
};

describe("assertAuthProvider", () => {
  test("accepts an ordinary structurally correct module service", () => {
    expect(() => assertAuthProvider(ordinaryService)).not.toThrow();
  });

  test("rejects role mismatches and missing methods", () => {
    expect(() =>
      assertAuthProvider({ ...ordinaryService, providerRole: "payment" }),
    ).toThrow('marked for "payment"');
    expect(() =>
      assertAuthProvider({
        authenticate: async () => null,
        getPrincipal: async () => null,
      }),
    ).toThrow("issueApiKey");
  });
});

test("auth records reject malformed principals and secret-bearing key shapes", () => {
  const record = {
    id: "key",
    subjectId: "user",
    label: "deploy",
    prefix: "dm_",
    scopes: ["read"],
    createdAt: new Date(),
  };
  expect(isAuthPrincipal({ id: "user", claims: {} })).toBe(true);
  expect(isAuthPrincipal({ id: "", claims: [] })).toBe(false);
  expect(isApiKeyPrincipal({ id: "user", keyId: "key", scopes: [] })).toBe(
    true,
  );
  expect(isApiKeyPrincipal({ id: "user", keyId: "", scopes: [1] })).toBe(false);
  expect(isApiKeyRecord(record)).toBe(true);
  expect(isApiKeyRecord({ ...record, createdAt: "today" })).toBe(false);
  expect(isIssuedApiKey({ ...record, secret: "once" })).toBe(true);
  expect(isIssuedApiKey({ ...record, secret: "" })).toBe(false);
});
