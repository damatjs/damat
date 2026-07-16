import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, writeCalls, describe, it, expect } from "./context";

describe("readModuleConfigEntry", () => {
  it("round-trips what registerModuleInConfig writes", async () => {
    fsState.existsMap = { "/app/damat.config.ts": true };
    fsState.readFileMap = {
      "/app/damat.config.ts": `export default defineConfig({\n  modules: {},\n});\n`,
    };
    const { registerModuleInConfig, readModuleConfigEntry } =
      await import("../../commands/module/helpers/config");
    const source = {
      type: "registry",
      ref: "user@1.0.0",
      url: "https://registry.example/user",
      version: "1.0.0",
      owner: "acme",
      verification: "verified",
      integrity: "sha256-abc",
      installedAt: "2026-01-01T00:00:00.000Z",
    } as const;
    expect(
      registerModuleInConfig(
        "/app/damat.config.ts",
        "user",
        "./src/modules/user",
        source as never,
      ),
    ).toBe(true);
    const written = writeCalls.find((c) => c.path === "/app/damat.config.ts");
    // Feed the written config back through the reader.
    fsState.readFileMap = { "/app/damat.config.ts": written!.content };
    const entry = readModuleConfigEntry("/app/damat.config.ts", "user");
    expect(entry).not.toBeNull();
    expect(entry!.resolve).toBe("./src/modules/user");
    expect(entry!.source).toEqual(source);
  });
});
