import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, describe, it, expect } from "./context";

describe("registerModuleInConfig", () => {
  const get = async () =>
    (await import("../../commands/module/helpers/config"))
      .registerModuleInConfig;

  it("returns false when neither a modules block nor a closing }) is found", async () => {
    fsState.existsMap = { "/app/damat.config.ts": true };
    fsState.readFileMap = { "/app/damat.config.ts": `const x = 1;` };
    const fn = await get();
    expect(fn("/app/damat.config.ts", "user", "./src/modules/user")).toBe(
      false,
    );
  });
});
