// Import the shared setup FIRST — installs node:fs, node:child_process and Bun.spawn
// mocks before any command source is evaluated.
import {
  state as fsState,
  spawnCalls,
  spawnSyncCalls,
  rmCalls,
  resetMocks,
} from "./setup";
import { describe, it, expect, mock, beforeEach } from "bun:test";
import { createContext } from "./helpers";
import * as realModule from "@damatjs/module";

// ---------------------------------------------------------------------------
// Shared mutable state for the @damatjs/module mock (same pattern as
// moduleHandlers.test.ts). Since mock.module() is process-wide in Bun we
// re-declare our own mm object and re-register the mock here; whichever file
// wins the global race is controlled by this mm state.
// ---------------------------------------------------------------------------
const mm = {
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
  locateModuleDir: (_cwd: string) => {
    if (mm.locateThrows) throw mm.locateThrows;
    return mm.locateResult;
  },
  validateModuleDir: (_dir: string) => mm.validateReport,
  readModuleManifest: (_dir: string) => mm.manifest,
}));

// ---------------------------------------------------------------------------
// Gateway fetch stub — intercepts PUT /api/npm/:name calls.
// Must be installed before the publish module is imported.
// ---------------------------------------------------------------------------
const gw = {
  status: 201,
  body: { success: true, package: { name: "user", version: "1.0.0" } } as unknown,
  calls: [] as Array<{
    url: string;
    method: string;
    headers: Record<string, string>;
    body: unknown;
  }>,
};

const _originalFetch = globalThis.fetch;
globalThis.fetch = async (
  url: string | URL | Request,
  init?: RequestInit,
): Promise<Response> => {
  const u = String(url);
  const body = init?.body ? JSON.parse(init.body as string) : undefined;
  gw.calls.push({
    url: u,
    method: init?.method ?? "GET",
    headers: (init?.headers ?? {}) as Record<string, string>,
    body,
  });
  return new Response(JSON.stringify(gw.body), {
    status: gw.status,
    headers: { "content-type": "application/json" },
  });
};

// ---------------------------------------------------------------------------
// Helpers.
// ---------------------------------------------------------------------------
/** Set up the minimal fs state for a successful publish run. */
function basePublishSetup() {
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

// ---------------------------------------------------------------------------
// beforeEach: reset everything to a clean slate.
// ---------------------------------------------------------------------------
beforeEach(() => {
  resetMocks();

  // Reset module mock state.
  mm.locateThrows = null;
  mm.locateResult = "/m/src";
  mm.validateReport = {
    valid: true,
    errors: [],
    warnings: [],
    manifest: { name: "user" },
  };
  mm.manifest = { name: "user", version: "1.0.0", description: "User module" };

  // Reset gateway stub.
  gw.calls.length = 0;
  gw.status = 201;
  gw.body = { success: true, package: { name: "user", version: "1.0.0" } };

  // Set env defaults (tests that need different values override per-test).
  process.env.DAMAT_PUBLISH_TOKEN = "tok123";
  process.env.DAMAT_MODULE_REGISTRY =
    "https://registry.example.com/api/damat/modules";
  delete process.env.DAMAT_PUBLISH_REGISTRY;
});

// ---------------------------------------------------------------------------
// Tests.
// ---------------------------------------------------------------------------
describe("module publish command", () => {
  const get = async () =>
    (await import("../module/publish")).modulePublishCommand;

  it("publishes successfully with full flow", async () => {
    basePublishSetup();
    const cmd = await get();
    const { ctx, logger } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);

    expect(res.exitCode).toBe(0);
    // Type-check ran (bunx tsc --noEmit).
    expect(spawnCalls[0]?.cmd).toEqual(["bunx", "tsc", "--noEmit"]);
    // tar was called.
    const tarCall = spawnSyncCalls.find((c) => c.cmd === "tar");
    expect(tarCall).toBeDefined();
    expect(tarCall?.args[0]).toBe("-czf");
    // PUT to gateway.
    expect(gw.calls).toHaveLength(1);
    expect(gw.calls[0]?.url).toContain("/api/npm/user");
    expect(gw.calls[0]?.method).toBe("PUT");
    expect((gw.calls[0]?.headers as Record<string, string>)?.authorization).toBe(
      "Bearer tok123",
    );
    // Success logged.
    expect(logger.success).toHaveBeenCalled();
    const successCall = logger.success.mock.calls.find((c) =>
      String(c[0]).includes("user@1.0.0"),
    );
    expect(successCall).toBeDefined();
  });

  it("--dry-run skips the PUT", async () => {
    basePublishSetup();
    const cmd = await get();
    const { ctx, logger } = createContext({ "dry-run": true }, { cwd: "/m" });
    const res = await cmd.handler(ctx);

    expect(res.exitCode).toBe(0);
    expect(gw.calls).toHaveLength(0);
    const dryRunMsg = logger.info.mock.calls.find((c) =>
      String(c[0]).toLowerCase().includes("dry run"),
    );
    expect(dryRunMsg).toBeDefined();
    expect(String(dryRunMsg?.[0])).toContain("user@1.0.0");
  });

  it("403 from gateway yields actionable error", async () => {
    basePublishSetup();
    gw.status = 403;
    gw.body = { error: "bad token" };

    const cmd = await get();
    const { ctx, logger } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);

    expect(res.exitCode).toBe(1);
    const errCall = logger.error.mock.calls.find((c) =>
      String(c[0]).toLowerCase().includes("token"),
    );
    expect(errCall).toBeDefined();
  });

  it("aborts if no gateway URL", async () => {
    basePublishSetup();
    delete process.env.DAMAT_MODULE_REGISTRY;
    delete process.env.DAMAT_PUBLISH_REGISTRY;

    const cmd = await get();
    const { ctx, logger } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);

    expect(res.exitCode).toBe(1);
    const errCall = logger.error.mock.calls.find(
      (c) =>
        String(c[0]).toLowerCase().includes("registry") ||
        String(c[0]).toLowerCase().includes("gateway"),
    );
    expect(errCall).toBeDefined();
    expect(gw.calls).toHaveLength(0);
  });

  it("aborts if no token", async () => {
    basePublishSetup();
    delete process.env.DAMAT_PUBLISH_TOKEN;

    const cmd = await get();
    const { ctx, logger } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);

    expect(res.exitCode).toBe(1);
    const errCall = logger.error.mock.calls.find((c) =>
      String(c[0]).toLowerCase().includes("token"),
    );
    expect(errCall).toBeDefined();
    expect(gw.calls).toHaveLength(0);
  });

  it("--no-typecheck skips tsc", async () => {
    basePublishSetup();
    const cmd = await get();
    const { ctx } = createContext({ typecheck: false }, { cwd: "/m" });
    const res = await cmd.handler(ctx);

    expect(res.exitCode).toBe(0);
    expect(spawnCalls).toHaveLength(0);
  });

  it("aborts when validate fails", async () => {
    basePublishSetup();
    mm.validateReport = {
      valid: false,
      errors: ["bad"],
      warnings: [],
      manifest: { name: "user" },
    };

    const cmd = await get();
    const { ctx } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);

    expect(res.exitCode).toBe(1);
    expect(gw.calls).toHaveLength(0);
  });

  it("token flag overrides env", async () => {
    basePublishSetup();

    const cmd = await get();
    const { ctx } = createContext({ token: "flag-tok" }, { cwd: "/m" });
    const res = await cmd.handler(ctx);

    expect(res.exitCode).toBe(0);
    expect(
      (gw.calls[0]?.headers as Record<string, string>)?.authorization,
    ).toBe("Bearer flag-tok");
  });

  it("registry flag overrides env", async () => {
    basePublishSetup();

    const cmd = await get();
    const { ctx } = createContext(
      { registry: "https://custom.example.com" },
      { cwd: "/m" },
    );
    const res = await cmd.handler(ctx);

    expect(res.exitCode).toBe(0);
    expect(gw.calls[0]?.url).toBe(
      "https://custom.example.com/api/npm/user",
    );
  });

  it("cleans up temp dir in finally (rmSync called)", async () => {
    basePublishSetup();

    const cmd = await get();
    const { ctx } = createContext({}, { cwd: "/m" });
    await cmd.handler(ctx);

    // rmSync should have been called for the temp dir cleanup.
    expect(rmCalls.length).toBeGreaterThan(0);
    const cleanupCall = rmCalls.find((c) =>
      String(c.path).includes("damat-publish-"),
    );
    expect(cleanupCall).toBeDefined();
  });

  it("fails with the tsc exit code when the type-check fails", async () => {
    basePublishSetup();
    fsState.spawnExitCode = 2;
    const cmd = await get();
    const { ctx } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(2);
    expect(gw.calls).toHaveLength(0);
  });

  it("reports locate failure during the validate step", async () => {
    basePublishSetup();
    mm.locateThrows = new Error("no module dir here");
    const cmd = await get();
    const { ctx, logger } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some((c) => String(c[0]).includes("Could not locate module")),
    ).toBe(true);
  });

  it("prints validation warnings while still publishing", async () => {
    basePublishSetup();
    mm.validateReport = {
      valid: true,
      errors: [],
      warnings: ["manifest: description is empty"],
      manifest: { name: "user" },
    };
    const cmd = await get();
    const { ctx, logger } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(
      logger.warn.mock.calls.some((c) => String(c[0]).includes("description is empty")),
    ).toBe(true);
  });

  it("rejects a package.json without a name", async () => {
    basePublishSetup();
    fsState.readFileMap["/m/package.json"] = JSON.stringify({ version: "1.0.0" });
    const cmd = await get();
    const { ctx, logger } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(logger.error.mock.calls.some((c) => String(c[0]).includes("`name`"))).toBe(true);
  });

  it("rejects a package.json without a version", async () => {
    basePublishSetup();
    fsState.readFileMap["/m/package.json"] = JSON.stringify({ name: "user" });
    const cmd = await get();
    const { ctx, logger } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(logger.error.mock.calls.some((c) => String(c[0]).includes("`version`"))).toBe(true);
  });

  it("reports an unreadable package.json", async () => {
    basePublishSetup();
    fsState.readFileMap["/m/package.json"] = "{ not json";
    const cmd = await get();
    const { ctx, logger } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some((c) => String(c[0]).includes("Could not read package.json")),
    ).toBe(true);
  });

  it("reports a manifest read failure when validation is skipped", async () => {
    basePublishSetup();
    mm.locateThrows = new Error("gone");
    const cmd = await get();
    const { ctx, logger } = createContext({ validate: false }, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some((c) => String(c[0]).includes("Could not read module manifest")),
    ).toBe(true);
  });

  it("fails cleanly when tar cannot create the tarball", async () => {
    basePublishSetup();
    fsState.spawnSyncResult = { status: 1, stdout: "", stderr: "tar: boom" };
    const cmd = await get();
    const { ctx, logger } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some((c) => String(c[0]).includes("Failed to create tarball")),
    ).toBe(true);
    expect(gw.calls).toHaveLength(0);
  });

  it("400 from the gateway points at the manifest", async () => {
    basePublishSetup();
    gw.status = 400;
    gw.body = { error: "bad manifest" };
    const cmd = await get();
    const { ctx, logger } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some((c) => String(c[0]).includes("check the module manifest")),
    ).toBe(true);
  });

  it("other gateway failures surface the status and body", async () => {
    basePublishSetup();
    gw.status = 502;
    gw.body = { error: "gateway down" };
    const cmd = await get();
    const { ctx, logger } = createContext({}, { cwd: "/m" });
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some((c) => String(c[0]).includes("Publish failed (502)")),
    ).toBe(true);
  });

  it("falls back to '(no body)' when the error response body is unreadable", async () => {
    basePublishSetup();
    const stubFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      ({
        ok: false,
        status: 500,
        text: () => Promise.reject(new Error("stream destroyed")),
      }) as unknown as Response) as typeof fetch;
    try {
      const cmd = await get();
      const { ctx, logger } = createContext({}, { cwd: "/m" });
      const res = await cmd.handler(ctx);
      expect(res.exitCode).toBe(1);
      expect(
        logger.error.mock.calls.some((c) => String(c[0]).includes("(no body)")),
      ).toBe(true);
    } finally {
      globalThis.fetch = stubFetch;
    }
  });
});
