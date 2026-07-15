import { beforeEach as registerReset } from "bun:test";
import { resetContext, baseLocalInstall } from "./context";
registerReset(resetContext);

import { fsState, writeCalls, describe, it, expect, createContext } from "./context";

describe("module add command", () => {
  const get = async () =>
    (await import("../../commands/module/add")).moduleAddCommand;

  it("reports a tsconfig 'present' (no-op) without warning when aliases exist", async () => {
    baseLocalInstall();
    fsState.readFileMap = {
      "/app/damat.config.ts": `export default defineConfig({\n  modules: {},\n});\n`,
      "/app/tsconfig.json": JSON.stringify({
        compilerOptions: {
          baseUrl: ".",
          paths: {
            "@user/*": ["./src/modules/user/*"],
            "@workflows": ["./src/workflows"],
            "@workflows/*": ["./src/workflows/*"],
          },
        },
      }),
    };
    const cmd = await get();
    const { ctx } = createContext(
      { dir: "src/modules", "allow-unverified": true },
      { args: ["/pkg"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    // tsconfig untouched (already present).
    expect(writeCalls.some((w) => w.path === "/app/tsconfig.json")).toBe(false);
  });
});
