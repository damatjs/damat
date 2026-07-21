import { afterEach, beforeEach, expect, test } from "bun:test";
import type { AppConfig } from "../../config";
import { initAuth } from "../../services/auth";
import { clearModules, registerModule } from "../../services/moduleService";
import {
  bindProviders,
  clearProviders,
  getAllProviders,
  getProvider,
} from "../../services/providers";

const logger = {
  info: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
} as never;

const authService = {
  authenticate: async () => null,
  getPrincipal: async () => null,
  issueApiKey: async () => ({
    id: "key",
    subjectId: "user",
    label: "automation",
    secret: "once",
    prefix: "dm_",
    scopes: [],
    createdAt: new Date(),
  }),
  getApiKey: async () => null,
  listApiKeys: async () => [],
  verifyApiKey: async () => null,
  revokeApiKey: async () => undefined,
};

function config(): AppConfig {
  return {
    projectConfig: { http: { port: 3000, host: "localhost" } },
    modules: { auth: { resolve: "./src/modules/auth" } },
    providers: { auth: { module: "auth" } },
  };
}

beforeEach(() => {
  clearModules();
  clearProviders();
});
afterEach(() => {
  clearModules();
  clearProviders();
});

test("provider binding reuses the exact initialized module service", () => {
  let initialized = 0;
  registerModule("auth", {
    service: authService,
    init: () => {
      initialized++;
      return authService;
    },
  } as never);
  const bindings = bindProviders(config().providers, logger);
  const runtime = initAuth(config(), logger);
  expect(initialized).toBe(1);
  expect(bindings.get("auth")).toBe(authService);
  expect(getAllProviders()).toBe(bindings);
  expect(getProvider("auth")).toBe(authService as never);
  expect(runtime?.provider).toBe(authService);
});

test("missing modules and marked role mismatches fail binding", () => {
  expect(() => bindProviders({ auth: { module: "missing" } })).toThrow(
    'missing module "missing"',
  );
  registerModule("auth", {
    service: { ...authService, providerRole: "payment" },
    init: () => undefined,
  } as never);
  expect(() => bindProviders(config().providers)).toThrow(
    'marked for "payment"',
  );
});

test("auth startup validates the structural contract", () => {
  registerModule("auth", {
    service: {
      authenticate: async () => null,
      getPrincipal: async () => null,
    },
    init: () => undefined,
  } as never);
  bindProviders(config().providers);
  expect(() => initAuth(config(), logger)).toThrow("issueApiKey");
});

test("auth startup rejects a binding that was not initialized", () => {
  expect(() => initAuth(config(), logger)).toThrow("was not initialized");
});
