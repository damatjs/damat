import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, describe, it, expect } from "./context";

describe("readModuleConfigEntry", () => {
  const get = async () =>
    (await import("../../commands/module/helpers/config"))
      .readModuleConfigEntry;

  it("returns an empty entry when resolve/source are absent", async () => {
    fsState.existsMap = { "/app/damat.config.ts": true };
    fsState.readFileMap = {
      "/app/damat.config.ts": `modules: {\n  user: {\n    id: "user",\n  },\n}`,
    };
    const fn = await get();
    const entry = fn("/app/damat.config.ts", "user");
    expect(entry).not.toBeNull();
    expect(entry!.resolve).toBeUndefined();
    expect(entry!.source).toBeUndefined();
  });
});
