import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, writeCalls, describe, it, expect } from "./context";

describe("registerModuleInConfig", () => {
  const get = async () =>
    (await import("../../commands/module/helpers/config"))
      .registerModuleInConfig;

  it("adds a modules block when none exists, before the closing })", async () => {
    fsState.existsMap = { "/app/damat.config.ts": true };
    fsState.readFileMap = {
      "/app/damat.config.ts": `export default defineConfig({\n  name: "app",\n});\n`,
    };
    const fn = await get();
    const ok = fn("/app/damat.config.ts", "user", "./src/modules/user");
    expect(ok).toBe(true);
    const w = writeCalls.find((c) => c.path === "/app/damat.config.ts");
    expect(w!.content).toContain("modules: {");
    expect(w!.content).toContain("user:");
  });
});
