import { beforeEach as registerReset } from "bun:test";
import { resetContext, baseLocalInstall } from "./context";
registerReset(resetContext);
import { fsState, writeCalls, spawnSyncCalls, rmCalls, cpCalls, appendCalls, describe, it, expect, createContext, mm } from "./context";
describe("module add command", () => {
  const get = async () =>
    (await import("../../commands/module/add")).moduleAddCommand;
  it("--dry-run prints the full plan and writes nothing", async () => {
    baseLocalInstall({
      "/pkg/src/api/routes": true,
      "/pkg/src/workflows": true,
      "/pkg/src/links": true,
      "/pkg/package.json": true,
    });
    fsState.readFileMap = {
      "/app/damat.config.ts": `export default defineConfig({\n  modules: {},\n});\n`,
      "/app/tsconfig.json": JSON.stringify({}),
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
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules", "allow-unverified": true, "dry-run": true },
      { args: ["/pkg"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    const plan = logger.info.mock.calls.find((c) =>
      String(c[0]).startsWith("Dry run"),
    );
    expect(plan).toBeDefined();
    expect(plan![0]).toContain("install module files to src/modules/user/");
    expect(plan![0]).toContain("install routes to src/api/routes/user/");
    expect(plan![0]).toContain("install workflows to src/workflows/user/");
    expect(plan![0]).toContain("install links to src/links/user/");
    expect(plan![0]).toContain('register "user" in damat.config.ts');
    expect(plan![0]).toContain("STRIPE_KEY");
    expect(plan![0]).toContain("bun add stripe");
    expect(writeCalls).toHaveLength(0);
    expect(cpCalls).toHaveLength(0);
    expect(rmCalls).toHaveLength(0);
    expect(appendCalls).toHaveLength(0);
    expect(spawnSyncCalls.some((c) => c.cmd === "bun")).toBe(false);
  });
});
