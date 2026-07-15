import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, writeCalls, rmCalls, cpCalls, describe, it, expect, createContext, maps, configWithUser } from "./context";

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

  it("prints the file diff and exits 1 without --yes", async () => {
    baseInstalled({
      "/pkg/src": true,
      "/app/src/modules/user/module.json": true,
    });
    fsState.readFileMap = {
      ...fsState.readFileMap,
      "/app/src/modules/user/module.json": JSON.stringify({ version: "0.9.0" }),
      "/pkg/src/b.ts": "new content",
      "/app/src/modules/user/b.ts": "old content",
      "/pkg/src/c.ts": "brand new",
      "/app/src/modules/user/d.ts": "obsolete",
      "/pkg/src/models/m.ts": "same",
      "/app/src/modules/user/models/m.ts": "same",
    };
    maps.readdir = {
      // "api" is a split-out subtree → skipped; "node_modules" nested → skipped.
      "/pkg/src": ["api", "b.ts", "c.ts", "models"],
      "/pkg/src/models": ["m.ts", "node_modules"],
      "/app/src/modules/user": ["b.ts", "d.ts", "models"],
      "/app/src/modules/user/models": ["m.ts"],
    };
    maps.statDir = {
      "/pkg/src/models": true,
      "/app/src/modules/user/models": true,
    };
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules", "allow-unverified": true },
      { args: ["user"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    // Version summary used the installed manifest.
    const header = logger.info.mock.calls.find((c) => c[0] === 'Update "user"');
    expect(header![1]).toMatchObject({ installed: "0.9.0", incoming: "1.1.0" });
    // Diff lines: added / changed / removed, with the unchanged file omitted.
    const diff = logger.info.mock.calls.find((c) =>
      String(c[0]).includes("File changes under src/modules/user/:"),
    );
    expect(diff).toBeDefined();
    expect(diff![0]).toContain("+ c.ts");
    expect(diff![0]).toContain("~ b.ts (will be overwritten)");
    expect(diff![0]).toContain("- d.ts (will be deleted)");
    expect(diff![0]).not.toContain("m.ts");
    expect(
      logger.warn.mock.calls.some((c) => String(c[0]).includes("local edits")),
    ).toBe(true);
    expect(
      logger.error.mock.calls.some((c) =>
        String(c[0]).includes("Re-run with --yes"),
      ),
    ).toBe(true);
    // Nothing was applied.
    expect(cpCalls).toHaveLength(0);
    expect(rmCalls).toHaveLength(0);
    expect(writeCalls).toHaveLength(0);
  });
});
