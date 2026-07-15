import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, describe, it, expect } from "./context";

describe("readModuleConfigEntry", () => {
  const get = async () =>
    (await import("../../commands/module/helpers/config"))
      .readModuleConfigEntry;

  it("omits source when the block holds no recognized fields", async () => {
    fsState.existsMap = { "/app/damat.config.ts": true };
    fsState.readFileMap = {
      "/app/damat.config.ts": `modules: {\n  user: {\n    resolve: "./src/modules/user",\n    source: {\n      junk: "x",\n    },\n  },\n}`,
    };
    const fn = await get();
    const entry = fn("/app/damat.config.ts", "user");
    expect(entry!.resolve).toBe("./src/modules/user");
    expect(entry!.source).toBeUndefined();
  });
});
