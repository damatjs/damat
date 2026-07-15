import { mock } from "bun:test";
import * as realModule from "@damatjs/module";
import { resetMocks, state as fsState } from "../setup";

export const mm = {
  locateThrows: null as Error | null,
  locateResult: "/m/src",
  validateReport: {
    valid: true,
    errors: [] as string[],
    warnings: [] as string[],
    manifest: { name: "user" } as { name: string } | undefined,
  },
  manifest: {
    name: "user",
    version: "1.0.0",
    description: "User module",
  } as Record<string, unknown>,
};
mock.module("@damatjs/module", () => ({
  ...realModule,
  locateModuleDir: () => {
    if (mm.locateThrows) throw mm.locateThrows;
    return mm.locateResult;
  },
  validateModuleDir: () => mm.validateReport,
  readModuleManifest: () => mm.manifest,
}));

export const gw = {
  status: 201,
  body: {
    success: true,
    package: { name: "user", version: "1.0.0" },
  } as unknown,
  calls: [] as Array<{
    url: string;
    method: string;
    headers: Record<string, string>;
    body: unknown;
  }>,
};
export const originalFetch = globalThis.fetch;
globalThis.fetch = async (
  url: string | URL | Request,
  init?: RequestInit,
): Promise<Response> => {
  gw.calls.push({
    url: String(url),
    method: init?.method ?? "GET",
    headers: (init?.headers ?? {}) as Record<string, string>,
    body: init?.body ? JSON.parse(init.body as string) : undefined,
  });
  return new Response(JSON.stringify(gw.body), {
    status: gw.status,
    headers: { "content-type": "application/json" },
  });
};

export function basePublishSetup(): void {
  fsState.existsMap = {
    "/m/tsconfig.json": true,
    "/m/src": true,
    "/m/module.json": true,
    "/m/package.json": true,
  };
  fsState.readFileMap = {
    "/m/package.json": JSON.stringify({ name: "user", version: "1.0.0" }),
  };
}

export function resetPublishFixture(): void {
  resetMocks();
  mm.locateThrows = null;
  mm.locateResult = "/m/src";
  mm.validateReport = {
    valid: true,
    errors: [],
    warnings: [],
    manifest: { name: "user" },
  };
  mm.manifest = {
    name: "user",
    version: "1.0.0",
    description: "User module",
  };
  gw.calls.length = 0;
  gw.status = 201;
  gw.body = { success: true, package: { name: "user", version: "1.0.0" } };
  process.env.DAMAT_PUBLISH_TOKEN = "tok123";
  process.env.DAMAT_MODULE_REGISTRY =
    "https://registry.example.com/api/damat/modules";
  delete process.env.DAMAT_PUBLISH_REGISTRY;
}
