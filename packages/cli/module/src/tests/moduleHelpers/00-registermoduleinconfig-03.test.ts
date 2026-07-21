import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, writeCalls, describe, it, expect } from "./context";

describe("registerModuleInConfig", () => {
  const get = async () =>
    (await import("../../commands/module/helpers/config"))
      .registerModuleInConfig;

  it("camelizes a kebab-case module name into a valid key", async () => {
    fsState.existsMap = { "/app/damat.config.ts": true };
    fsState.readFileMap = {
      "/app/damat.config.ts": `defineConfig({\n  modules: {},\n});\n`,
    };
    const fn = await get();
    fn(
      "/app/damat.config.ts",
      "user-management",
      "./src/modules/user-management",
    );
    const w = writeCalls.find((c) => c.path === "/app/damat.config.ts");
    // "user-management" → identifier key "userManagement".
    expect(w!.content).toContain("userManagement:");
  });
});
