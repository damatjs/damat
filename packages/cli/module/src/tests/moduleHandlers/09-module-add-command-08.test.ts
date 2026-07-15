import { beforeEach as registerReset } from "bun:test";
import { resetContext, baseLocalInstall } from "./context";
registerReset(resetContext);

import { fsState, mockReaddirSync, describe, it, expect, createContext, mockStatSyncForLinks } from "./context";

describe("module add command", () => {
  const get = async () =>
    (await import("../../commands/module/add")).moduleAddCommand;

  it("warns when links cannot be ensured in an unparseable config", async () => {
    baseLocalInstall({
      "/pkg/src/links": true,
      "/app/src/links/user/models/user-org.ts": false,
      "/app/src/links/user/models": true,
      "/app/src/links": true,
      "/app/src/links/user/index.ts": true,
    });
    // A config with neither a modules block nor a closing `})` → both
    // registerModuleInConfig and ensureLinksInConfig return false.
    fsState.readFileMap = {
      "/app/damat.config.ts": `const config = 1;`,
      "/app/tsconfig.json": JSON.stringify({}),
    };
    mockReaddirSync.mockImplementation((p: string) => {
      if (p === "/pkg/src/links") return ["user-org.ts"] as never;
      if (p === "/app/src/links/user/models") return ["user-org.ts"] as never;
      if (p === "/app/src/links") return ["user"] as never;
      return [] as never;
    });
    mockStatSyncForLinks();
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules", "allow-unverified": true },
      { args: ["/pkg"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(
      logger.warn.mock.calls.some((c) =>
        String(c[0]).includes('Add `links: "./src/links"`'),
      ),
    ).toBe(true);
  });
});
