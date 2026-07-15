import { beforeEach as registerReset } from "bun:test";
import { resetContext, baseLocalInstall } from "./context";
registerReset(resetContext);
import { fsState, spawnSyncCalls, appendCalls, describe, it, expect, createContext, mm } from "./context";
describe("module add command", () => {
  const get = async () =>
    (await import("../../commands/module/add")).moduleAddCommand;
  it("warns when config/tsconfig cannot be edited and reports missing env + installs packages", async () => {
    baseLocalInstall({
      "/app/damat.config.ts": false, // registerModuleInConfig → false (warn)
      "/app/tsconfig.json": false, // registerModuleTsconfigPaths → skipped (warn)
      "/app/.env.example": true,
      "/app/.env": false,
      "/pkg/package.json": true, // collectModulePackages reads deps
    });
    fsState.readFileMap = {
      "/app/.env.example": "",
      "/pkg/package.json": JSON.stringify({
        dependencies: { stripe: "^14.0.0" },
      }),
    };
    mm.manifest = {
      name: "user",
      version: "1.0.0",
      description: "User",
      env: [{ name: "STRIPE_KEY", required: true, example: "sk" }],
    };
    fsState.spawnSyncResult = { status: 0, stdout: "ok", stderr: "" };
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules", "allow-unverified": true },
      { args: ["/pkg"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(
      logger.warn.mock.calls.some((c) =>
        String(c[0]).includes("damat.config.ts"),
      ),
    ).toBe(true);
    expect(
      logger.warn.mock.calls.some((c) =>
        String(c[0]).includes("tsconfig.json"),
      ),
    ).toBe(true);
    expect(
      logger.info.mock.calls.some((c) => String(c[0]).includes(".env.example")),
    ).toBe(true);
    expect(
      logger.warn.mock.calls.some((c) =>
        String(c[0]).includes("before starting"),
      ),
    ).toBe(true);
    expect(appendCalls.length).toBeGreaterThan(0);
    const bunAdd = spawnSyncCalls.find((c) => c.cmd === "bun");
    expect(bunAdd).toBeDefined();
    expect(bunAdd!.args).toContain("--ignore-scripts");
  });
});
