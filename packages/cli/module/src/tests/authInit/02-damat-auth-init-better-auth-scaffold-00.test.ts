import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import {
  state,
  writeCalls,
  mockMkdirSync,
  describe,
  test,
  expect,
  run,
} from "./context";

describe("damat auth init better-auth — scaffold", () => {
  test("writes the storage module files, a migrations dir, and registers the module", async () => {
    // A minimal config with a modules block so registration succeeds.
    state.existsMap["/app/damat.config.ts"] = true;
    state.readFileMap["/app/damat.config.ts"] =
      "export default defineConfig({\n  modules: {\n  },\n});\n";

    const { result, logger } = run(["better-auth"]);
    expect((await result).exitCode).toBe(0);

    for (const file of [
      "/app/src/modules/auth/models/index.ts",
      "/app/src/modules/auth/service.ts",
      "/app/src/modules/auth/index.ts",
      "/app/src/modules/auth/damat.json",
      "/app/src/modules/auth/README.md",
    ]) {
      expect(writeCalls.some((c) => c.path === file)).toBe(true);
    }
    // migrations dir created
    expect(
      mockMkdirSync.mock.calls.some((c) =>
        String(c[0]).endsWith("/auth/migrations"),
      ),
    ).toBe(true);
    // config gained the auth entry
    const config = writeCalls.find((c) => c.path === "/app/damat.config.ts");
    expect(config!.content).toContain("auth:");
    expect(config!.content).toContain('resolve: "./src/modules/auth"');
    expect(
      logger.success.mock.calls.some((c) =>
        String(c[0]).includes("Registered"),
      ),
    ).toBe(true);
  });
});
