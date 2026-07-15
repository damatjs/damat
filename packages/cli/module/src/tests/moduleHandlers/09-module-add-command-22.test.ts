import { beforeEach as registerReset } from "bun:test";
import { resetContext, baseLocalInstall, withVerifyPolicy } from "./context";
registerReset(resetContext);

import { fsState, spawnSyncCalls, cpCalls, describe, it, expect, createContext } from "./context";

describe("module add command", () => {
  const get = async () =>
    (await import("../../commands/module/add")).moduleAddCommand;

  it("refuses unsafe dependency specs before any file is written", async () => {
    baseLocalInstall({ "/pkg/package.json": true });
    fsState.readFileMap = {
      "/app/damat.config.ts": `export default defineConfig({\n  modules: {},\n});\n`,
      "/app/tsconfig.json": JSON.stringify({}),
      "/pkg/package.json": JSON.stringify({
        dependencies: { evil: "file:../../pwn" },
      }),
    };
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules" },
      { args: ["/pkg"], cwd: "/app" },
    );
    // Gate on specs even though the source itself was accepted.
    ctx.options["allow-unverified"] = false;
    await withVerifyPolicy("off", async () => {
      const res = await cmd.handler(ctx);
      expect(res.exitCode).toBe(1);
      expect(
        logger.error.mock.calls.some((c) =>
          String(c[0]).includes("unsafe package specs"),
        ),
      ).toBe(true);
      expect(cpCalls).toHaveLength(0);
      expect(spawnSyncCalls.some((c) => c.cmd === "bun")).toBe(false);
    });
  });
});
