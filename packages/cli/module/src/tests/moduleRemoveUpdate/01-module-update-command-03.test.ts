import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, describe, it, expect, createContext } from "./context";

describe("module update command", () => {
  const get = async () =>
    (await import("../../commands/module/update")).moduleUpdateCommand;

  it("exits 1 when the entry has no recorded source provenance", async () => {
    fsState.existsMap = {
      "/app/damat.config.ts": true,
      "/app/src/modules/user": true,
    };
    fsState.readFileMap = {
      "/app/damat.config.ts": `export default defineConfig({
  modules: {
    user: {
      resolve: "./src/modules/user",
      id: "user",
    },
  },
});
`,
    };
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules" },
      { args: ["user"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(1);
    expect(
      logger.error.mock.calls.some((c) =>
        String(c[0]).includes("no recorded source"),
      ),
    ).toBe(true);
  });
});
