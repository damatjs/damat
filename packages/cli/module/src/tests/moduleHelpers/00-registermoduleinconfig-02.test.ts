import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, writeCalls, describe, it, expect } from "./context";

describe("registerModuleInConfig", () => {
  const get = async () =>
    (await import("../../commands/module/helpers/config"))
      .registerModuleInConfig;

  it("is idempotent when the module is already registered", async () => {
    fsState.existsMap = { "/app/damat.config.ts": true };
    fsState.readFileMap = {
      "/app/damat.config.ts": `modules: {\n  user: { resolve: "./src/modules/user" },\n}`,
    };
    const fn = await get();
    expect(fn("/app/damat.config.ts", "user", "./src/modules/user")).toBe(true);
    // No write — already present.
    expect(
      writeCalls.find((c) => c.path === "/app/damat.config.ts"),
    ).toBeUndefined();
  });
});
