import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, writeCalls, describe, it, expect } from "./context";

describe("deregisterModuleFromConfig", () => {
  const get = async () =>
    (await import("../../commands/module/helpers/config"))
      .deregisterModuleFromConfig;

  it("handles an entry at the very start of the file without a trailing comma", async () => {
    fsState.existsMap = { "/app/damat.config.ts": true };
    fsState.readFileMap = {
      "/app/damat.config.ts": `user: {\n  resolve: "./x",\n}\nrest`,
    };
    const fn = await get();
    expect(fn("/app/damat.config.ts", "user")).toBe(true);
    const written = writeCalls.find((c) => c.path === "/app/damat.config.ts");
    expect(written!.content).toBe("\nrest");
  });
});
