import { beforeEach as registerReset } from "bun:test";
import { resetContext, baseLocalInstall } from "./context";
registerReset(resetContext);

import { fsState, mockReaddirSync, describe, it, expect, createContext } from "./context";

describe("module add command", () => {
  const get = async () =>
    (await import("../../commands/module/add")).moduleAddCommand;

  it("logs the split targets and rebuilds workflow barrels when present", async () => {
    baseLocalInstall({
      "/pkg/src/api/routes": true,
      "/pkg/src/workflows": true,
      "/pkg/tests": true,
      // generateBarrels is stubbed to a no-op above; the target tree stays absent
      // anyway to mirror a fresh app.
      "/app/src/workflows": false,
    });
    fsState.readFileMap = {
      "/app/damat.config.ts": `export default defineConfig({\n  modules: {},\n});\n`,
      "/app/tsconfig.json": JSON.stringify({}),
    };
    // mergeChildren reads each subtree's children.
    mockReaddirSync.mockImplementation((p: string) => {
      if (p === "/pkg/src/api/routes") return ["users"] as never;
      if (p === "/pkg/src/workflows") return ["users"] as never;
      if (p === "/pkg/tests") return ["contract.test.ts"] as never;
      return [] as never;
    });
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules", "allow-unverified": true },
      { args: ["/pkg"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(
      logger.info.mock.calls.some((c) => String(c[0]).includes("routes →")),
    ).toBe(true);
    expect(
      logger.info.mock.calls.some((c) => String(c[0]).includes("workflows →")),
    ).toBe(true);
    expect(
      logger.info.mock.calls.some((c) => String(c[0]).includes("tests →")),
    ).toBe(true);
  });
});
