import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, describe, it, expect, createContext, mm } from "./context";

describe("module add command", () => {
  const get = async () =>
    (await import("../../commands/module/add")).moduleAddCommand;

  it("warns on a verification message but proceeds", async () => {
    fsState.existsMap = {
      "/cache/user": true,
      "/cache/user/src/api/routes": false,
      "/cache/user/src/workflows": false,
      "/cache/user/src/links": false,
      "/cache/user/tests": false,
      "/app/src/modules/user": false,
      "/app/damat.config.ts": true,
      "/app/tsconfig.json": true,
      "/app/.env.example": false,
      "/app/.env": false,
      "/cache/user/package.json": false,
    };
    fsState.readFileMap = {
      "/app/damat.config.ts": `export default defineConfig({\n  modules: {},\n});\n`,
      "/app/tsconfig.json": JSON.stringify({}),
    };
    mm.parseRef = { name: "user" };
    mm.registryRecord = {
      source: "/cache/user",
      version: "1.0.0",
      owner: { namespace: "acme" },
      verification: { status: "verified" },
    };
    mm.verification = {
      allowed: true,
      status: "verified",
      message: "heads up",
    };
    mm.locateResult = "/cache/user/src";
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules" },
      { args: ["user"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(logger.warn).toHaveBeenCalledWith("heads up");
  });
});
