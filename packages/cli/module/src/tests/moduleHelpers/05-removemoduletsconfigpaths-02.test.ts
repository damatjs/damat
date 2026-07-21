import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, writeCalls, describe, it, expect } from "./context";

describe("removeModuleTsconfigPaths", () => {
  const get = async () =>
    (await import("../../commands/module/helpers/tsconfig"))
      .removeModuleTsconfigPaths;

  it("reports absent when the module alias is not present", async () => {
    fsState.existsMap = { "/app/tsconfig.json": true };
    fsState.readFileMap = {
      "/app/tsconfig.json": JSON.stringify({
        compilerOptions: { paths: { "@workflows": ["./src/workflows"] } },
      }),
    };
    const fn = await get();
    expect(fn("/app", "user")).toBe("absent");
    expect(writeCalls).toHaveLength(0);
  });
});
