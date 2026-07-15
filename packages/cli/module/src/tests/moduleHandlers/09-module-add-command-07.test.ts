import { beforeEach as registerReset } from "bun:test";
import { resetContext, baseLocalInstall } from "./context";
registerReset(resetContext);
import { fsState, mockReaddirSync, describe, it, expect, createContext, mockStatSyncForLinks } from "./context";
describe("module add command", () => {
  const get = async () =>
    (await import("../../commands/module/add")).moduleAddCommand;
  it("installs shipped links, ensures links config, and prints link next-steps", async () => {
    baseLocalInstall({
      "/pkg/src/links": true,
      "/app/src/links/user/models/user-org.ts": false,
      "/app/src/links/user/models": true,
      "/app/src/links": true,
      "/app/src/links/user/index.ts": true,
    });
    fsState.readFileMap = {
      "/app/damat.config.ts": `export default defineConfig({\n  modules: {},\n});\n`,
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
      logger.info.mock.calls.some((c) => String(c[0]).includes("links →")),
    ).toBe(true);
    expect(
      logger.success.mock.calls.some((c) =>
        String(c[0]).includes('links: "./src/links"'),
      ),
    ).toBe(true);
    expect(
      logger.info.mock.calls.some((c) =>
        String(c[0]).includes("migrate:create link:"),
      ),
    ).toBe(true);
  });
});
