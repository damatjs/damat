import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);
import { fsState, writeCalls, rmCalls, describe, it, expect, createContext, barrelCalls, maps, configWithUser, dirent } from "./context";
describe("module remove command", () => {
  const get = async () =>
    (await import("../../commands/module/remove")).moduleRemoveCommand;
  it("removes everything with --force despite dependents, incl. config/tsconfig/env cleanup", async () => {
    fsState.existsMap = {
      "/app/damat.config.ts": true,
      "/app/tsconfig.json": true,
      "/app/.env.example": true,
      "/app/src/modules": true,
      "/app/src/modules/user": true,
      "/app/src/workflows/user": true,
      "/app/src/links/user": true,
      "/app/src/links": true,
      "/app/src/modules/user/module.json": true,
      "/app/src/modules/billing/module.json": true,
    };
    fsState.readFileMap = {
      "/app/damat.config.ts": configWithUser,
      "/app/tsconfig.json": JSON.stringify({
        compilerOptions: {
          paths: {
            "@user/*": ["./src/modules/user/*"],
            "@workflows": ["./src/workflows"],
          },
        },
      }),
      "/app/.env.example": "BASE=1\n\n# --- module: user ---\nAPI_KEY=abc\n",
      "/app/src/modules/user/module.json": JSON.stringify({ name: "user" }),
      "/app/src/modules/billing/module.json": JSON.stringify({
        modules: ["user"],
      }),
    };
    maps.readdir = {
      "/app/src/modules": [dirent("user"), dirent("billing")],
      "/app/src/links": [], // no owners left after removal
    };
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules", force: true, "clean-env": true },
      { args: ["user"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(
      logger.warn.mock.calls.some((c) => String(c[0]).includes("billing")),
    ).toBe(true);
    for (const target of [
      "/app/src/modules/user",
      "/app/src/workflows/user",
      "/app/src/links/user",
    ]) {
      expect(rmCalls.some((c) => c.path === target)).toBe(true);
    }
    expect(writeCalls.some((w) => w.path === "/app/src/links/index.ts")).toBe(
      true,
    );
    expect(
      logger.info.mock.calls.some((c) => String(c[0]).includes("aggregator")),
    ).toBe(true);
    expect(barrelCalls).toContain("/app/src/workflows");
    const config = writeCalls.find((w) => w.path === "/app/damat.config.ts");
    expect(config).toBeDefined();
    expect(config!.content).not.toContain("user:");
    expect(config!.content).toContain("billing:");
    const tsconfig = writeCalls.find((w) => w.path === "/app/tsconfig.json");
    const json = JSON.parse(tsconfig!.content);
    expect(json.compilerOptions.paths["@user/*"]).toBeUndefined();
    expect(json.compilerOptions.paths["@workflows"]).toEqual(["./src/workflows"]);
    const env = writeCalls.find((w) => w.path === "/app/.env.example");
    expect(env!.content).toBe("BASE=1\n");
    expect(
      logger.info.mock.calls.some((c) =>
        String(c[0]).includes("Removed from .env.example: API_KEY"),
      ),
    ).toBe(true);
    expect(
      logger.warn.mock.calls.some((c) =>
        String(c[0]).includes(".env were left untouched"),
      ),
    ).toBe(true);
  });
});
