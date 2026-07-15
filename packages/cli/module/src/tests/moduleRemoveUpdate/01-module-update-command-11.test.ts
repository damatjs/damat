import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);
import { fsState, writeCalls, rmCalls, cpCalls, appendCalls, spawnSyncCalls, describe, it, expect, createContext, mm, barrelCalls, maps, configWithUser } from "./context";
describe("module update command", () => {
  const get = async () =>
    (await import("../../commands/module/update")).moduleUpdateCommand;
  /** An installed local-path module whose provenance points at /pkg. */
  function baseInstalled(extra: Record<string, boolean> = {}) {
    fsState.existsMap = {
      "/app/damat.config.ts": true,
      "/app/src/modules/user": true,
      "/pkg": true, // the recorded source resolves as a local path
      ...extra,
    };
    fsState.readFileMap = { "/app/damat.config.ts": configWithUser };
  }
  it("--yes force-reinstalls, refreshes provenance, syncs env, and installs packages", async () => {
    baseInstalled({
      "/pkg/src/workflows": true,
      "/pkg/package.json": true,
    });
    fsState.readFileMap["/pkg/package.json"] = JSON.stringify({
      dependencies: { stripe: "^14.0.0" },
    });
    maps.readdir = { "/pkg/src/workflows": ["users"] };
    mm.manifest = {
      name: "user",
      version: "1.1.0",
      env: [{ name: "API_KEY", required: true, example: "x" }],
    };
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules", yes: true, "allow-unverified": true },
      { args: ["user"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(rmCalls.some((c) => c.path === "/app/src/modules/user")).toBe(true);
    expect(
      cpCalls.some(
        (c) => c.src === "/pkg/src" && c.dest === "/app/src/modules/user",
      ),
    ).toBe(true);
    expect(
      cpCalls.some((c) => c.dest === "/app/src/workflows/user/users"),
    ).toBe(true);
    expect(barrelCalls).toContain("/app/src/workflows");
    const configWrites = writeCalls.filter(
      (w) => w.path === "/app/damat.config.ts",
    );
    expect(configWrites.length).toBe(2); // deregister + register
    const final = configWrites[configWrites.length - 1]!.content;
    expect(final).toContain('resolve: "./src/modules/user"');
    expect(final).toContain('ref: "/pkg"');
    expect(final).toContain("installedAt:");
    expect(final).not.toContain("2026-01-01T00:00:00.000Z");
    expect(final).toContain("billing:"); // sibling untouched
    expect(
      logger.success.mock.calls.some((c) =>
        String(c[0]).includes("provenance"),
      ),
    ).toBe(true);
    expect(
      appendCalls.some(
        (a) =>
          a.path === "/app/.env.example" && a.content.includes("API_KEY=x"),
      ),
    ).toBe(true);
    expect(
      logger.warn.mock.calls.some((c) => String(c[0]).includes("API_KEY")),
    ).toBe(true);
    const bunAdd = spawnSyncCalls.find((c) => c.cmd === "bun");
    expect(bunAdd).toBeDefined();
    expect(bunAdd!.args).toContain("stripe@^14.0.0");
  });
});
