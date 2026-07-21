import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, writeCalls, describe, it, expect } from "./context";

describe("removeModuleTsconfigPaths", () => {
  const get = async () =>
    (await import("../../commands/module/helpers/tsconfig"))
      .removeModuleTsconfigPaths;

  it("removes only the module's alias, leaving @workflows untouched", async () => {
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
    expect(fn("/app", "user")).toBe("updated");
    const written = writeCalls.find((c) => c.path === "/app/tsconfig.json");
    const json = JSON.parse(written!.content);
    expect(json.compilerOptions.paths["@user/*"]).toBeUndefined();
    expect(json.compilerOptions.paths["@workflows"]).toEqual([
      "./src/workflows",
    ]);
    expect(json.compilerOptions.paths["@workflows/*"]).toEqual([
      "./src/workflows/*",
    ]);
  });
});
