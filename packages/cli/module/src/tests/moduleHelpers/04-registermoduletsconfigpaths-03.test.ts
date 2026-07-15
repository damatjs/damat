import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, writeCalls, describe, it, expect } from "./context";

describe("registerModuleTsconfigPaths", () => {
  const get = async () =>
    (await import("../../commands/module/helpers/tsconfig"))
      .registerModuleTsconfigPaths;

  it("returns present when all aliases already exist", async () => {
    fsState.existsMap = { "/app/tsconfig.json": true };
    fsState.readFileMap = {
      "/app/tsconfig.json": JSON.stringify({
        compilerOptions: {
          baseUrl: ".",
          paths: {
            "@user/*": ["./src/modules/user/*"],
            "@workflows": ["./src/workflows"],
            "@workflows/*": ["./src/workflows/*"],
          },
        },
      }),
    };
    const fn = await get();
    expect(fn("/app", "user")).toBe("present");
    expect(
      writeCalls.find((c) => c.path === "/app/tsconfig.json"),
    ).toBeUndefined();
  });
});
