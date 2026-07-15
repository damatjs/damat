import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, describe, it, expect } from "./context";

describe("removeModuleTsconfigPaths", () => {
  const get = async () =>
    (await import("../../commands/module/helpers/tsconfig"))
      .removeModuleTsconfigPaths;

  it("skips when tsconfig.json is not plain JSON", async () => {
    fsState.existsMap = { "/app/tsconfig.json": true };
    fsState.readFileMap = { "/app/tsconfig.json": `{ // comment\n }` };
    const fn = await get();
    expect(fn("/app", "user")).toBe("skipped");
  });
});
