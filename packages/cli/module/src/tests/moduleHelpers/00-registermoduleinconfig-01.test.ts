import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, writeCalls, describe, it, expect } from "./context";

describe("registerModuleInConfig", () => {
  const get = async () =>
    (await import("../../commands/module/helpers/config"))
      .registerModuleInConfig;

  it("inserts an entry into an existing modules block", async () => {
    fsState.existsMap = { "/app/damat.config.ts": true };
    fsState.readFileMap = {
      "/app/damat.config.ts": `export default defineConfig({\n  modules: {\n  },\n});\n`,
    };
    const fn = await get();
    const ok = fn("/app/damat.config.ts", "user", "./src/modules/user", {
      type: "registry",
      ref: "user@1.0.0",
      url: "https://x",
      version: "1.0.0",
      owner: "acme",
      verification: "verified",
      integrity: "sha",
      installedAt: "2026-01-01",
    });
    expect(ok).toBe(true);
    const w = writeCalls.find((c) => c.path === "/app/damat.config.ts");
    expect(w!.content).toContain("user:");
    expect(w!.content).toContain('resolve: "./src/modules/user"');
    expect(w!.content).toContain("source:");
    expect(w!.content).toContain('type: "registry"');
  });
});
