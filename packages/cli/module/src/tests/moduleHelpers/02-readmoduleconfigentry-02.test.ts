import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, describe, it, expect } from "./context";

describe("readModuleConfigEntry", () => {
  const get = async () =>
    (await import("../../commands/module/helpers/config"))
      .readModuleConfigEntry;

  it("returns null when the entry's braces never balance", async () => {
    fsState.existsMap = { "/app/damat.config.ts": true };
    fsState.readFileMap = {
      "/app/damat.config.ts": `modules: {\n  user: {\n    resolve: "./x",\n`,
    };
    const fn = await get();
    expect(fn("/app/damat.config.ts", "user")).toBeNull();
  });
});
