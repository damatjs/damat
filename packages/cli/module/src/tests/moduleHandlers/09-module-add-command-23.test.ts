import { beforeEach as registerReset } from "bun:test";
import { resetContext, baseLocalInstall } from "./context";
registerReset(resetContext);

import { fsState, spawnSyncCalls, describe, it, expect, createContext } from "./context";

describe("module add command", () => {
  const get = async () =>
    (await import("../../commands/module/add")).moduleAddCommand;

  it("permits protocol ranges and lifecycle scripts only via the opt-in flags", async () => {
    baseLocalInstall({ "/pkg/package.json": true });
    fsState.readFileMap = {
      "/app/damat.config.ts": `export default defineConfig({\n  modules: {},\n});\n`,
      "/app/tsconfig.json": JSON.stringify({}),
      "/pkg/package.json": JSON.stringify({
        dependencies: { widget: "git+https://github.com/acme/widget.git" },
      }),
    };
    const cmd = await get();
    const { ctx } = createContext(
      { dir: "src/modules", "allow-unverified": true, "allow-scripts": true },
      { args: ["/pkg"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    const bunAdd = spawnSyncCalls.find((c) => c.cmd === "bun");
    expect(bunAdd!.args).toContain(
      "widget@git+https://github.com/acme/widget.git",
    );
    expect(bunAdd!.args).not.toContain("--ignore-scripts");
  });
});
