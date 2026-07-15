import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, mockReaddirSync, describe, it, expect, createContext } from "./context";

describe("module list command", () => {
  const get = async () =>
    (await import("../../commands/module/list")).moduleListCommand;

  it("lists modules with manifest meta, registration, and provenance", async () => {
    const config = `export default defineConfig({
  modules: {
    user: {
      resolve: "./src/modules/user",
      id: "user",
      source: {
        type: "registry",
        owner: "acme",
        verification: "verified",
      },
    },
  },
});
`;
    fsState.existsMap = {
      "/m/src/modules": true,
      "/m/damat.config.ts": true,
      "/m/src/modules/user/module.json": true,
      "/m/src/modules/ghost/module.json": false,
      "/m/src/modules/broken/module.json": true,
    };
    fsState.readFileMap = {
      "/m/damat.config.ts": config,
      "/m/src/modules/user/module.json": JSON.stringify({
        version: "1.2.3",
        description: "Users",
      }),
      "/m/src/modules/broken/module.json": "{not json",
    };
    // The first (and only) readdirSync call returns Dirent-like entries.
    mockReaddirSync.mockImplementationOnce(() => [
      { name: "user", isDirectory: () => true },
      { name: "ghost", isDirectory: () => true },
      { name: "broken", isDirectory: () => true },
      { name: "afile", isDirectory: () => false },
    ]);

    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules" },
      { cwd: "/m" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    // user is registered + has provenance meta.
    const userCall = logger.info.mock.calls.find((c) =>
      String(c[0]).startsWith("user@1.2.3"),
    );
    expect(userCall).toBeDefined();
    expect(userCall![0]).toContain("[registered]");
    expect(userCall![1]).toMatchObject({
      description: "Users",
      from: "registry",
      owner: "acme",
      verification: "verified",
    });
    // ghost has no manifest → "(no module.json)" and NOT registered.
    const ghostCall = logger.info.mock.calls.find((c) =>
      String(c[0]).startsWith("ghost"),
    );
    expect(ghostCall![0]).toContain("[NOT in damat.config.ts]");
    // broken manifest → "(invalid module.json)".
    const brokenCall = logger.info.mock.calls.find((c) =>
      String(c[0]).startsWith("broken"),
    );
    expect(brokenCall).toBeDefined();
  });
});
