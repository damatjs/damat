import { afterEach, expect, test } from "bun:test";
import { PoolManager } from "@damatjs/services";
import {
  assertAuthProvider,
  isApiKeyRecord,
  isIssuedApiKey,
  type AuthCredentials,
} from "../src";
import authModule, { FixtureAuthService } from "./providerModule";

afterEach(() => PoolManager.reset());

test("a complete auth provider initializes and operates as a normal module", async () => {
  setupPool();
  const initialized = authModule.init();
  expect(authModule.name).toBe("fixture-auth");
  expect(FixtureAuthService.providerRole).toBe("auth");
  expect(authModule.service.providerRole).toBe("auth");
  expect(authModule.service).not.toBe(initialized);
  expect(initialized.credentials).toEqual({ issuer: "fixture" });
  expect(initialized.getModels).toEqual([]);
  expect(
    await initialized.transaction(async () => initialized.providerRole),
  ).toBe("auth");
  expect(() => assertAuthProvider(authModule.service)).not.toThrow();
  expect(
    await authModule.service.authenticate(
      credentials({ bearerToken: "valid-session" }),
    ),
  ).toEqual({ id: "user-1", email: "user@example.com" });
  expect((await authModule.service.getPrincipal("user-1"))?.id).toBe("user-1");

  const issued = await authModule.service.issueApiKey({
    subjectId: "user-1",
    label: "deploy",
    scopes: ["read"],
  });
  expect(isIssuedApiKey(issued)).toBe(true);
  const safe = await authModule.service.getApiKey(issued.id);
  expect(isApiKeyRecord(safe)).toBe(true);
  expect("secret" in safe!).toBe(false);
  expect(
    await authModule.service.listApiKeys({ subjectId: "user-1" }),
  ).toHaveLength(1);
  expect(
    await authModule.service.verifyApiKey(
      credentials({ apiKey: issued.secret }),
    ),
  ).toMatchObject({ id: "user-1", keyId: issued.id, scopes: ["read"] });
  const rotated = await authModule.service.rotateApiKey!(issued.id);
  expect(rotated.secret).not.toBe(issued.secret);
  await authModule.service.revokeApiKey(issued.id);
  expect(await authModule.service.listApiKeys({ subjectId: "user-1" })).toEqual(
    [],
  );
  expect(
    await authModule.service.listApiKeys({
      subjectId: "user-1",
      includeRevoked: true,
    }),
  ).toHaveLength(1);
  expect(
    await authModule.service.verifyApiKey(
      credentials({ apiKey: rotated.secret }),
    ),
  ).toBeNull();
});

function setupPool(): void {
  PoolManager.setup({
    pool: {} as never,
    logger: {} as never,
    connectionManager: {} as never,
  });
  PoolManager.setEntityManager(transactionManager() as never);
}

function transactionManager() {
  return {
    transaction: async (run: (executor: object) => Promise<unknown>) => run({}),
  };
}

function credentials(values: Partial<AuthCredentials>): AuthCredentials {
  return {
    headers: {},
    cookies: {},
    authorization: null,
    bearerToken: null,
    apiKey: null,
    ...values,
  };
}
