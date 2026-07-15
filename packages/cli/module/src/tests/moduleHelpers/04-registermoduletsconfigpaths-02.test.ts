import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, writeCalls, describe, it, expect } from "./context";

describe("registerModuleTsconfigPaths", () => {
  const get = async () =>
    (await import("../../commands/module/helpers/tsconfig"))
      .registerModuleTsconfigPaths;

  it("adds portable aliases and a baseUrl when absent", async () => {
    fsState.existsMap = { "/app/tsconfig.json": true };
    fsState.readFileMap = { "/app/tsconfig.json": JSON.stringify({}) };
    const fn = await get();
    expect(fn("/app", "user")).toBe("updated");
    const w = writeCalls.find((c) => c.path === "/app/tsconfig.json");
    const json = JSON.parse(w!.content);
    expect(json.compilerOptions.baseUrl).toBe(".");
    expect(json.compilerOptions.paths["@user/*"]).toEqual([
      "./src/modules/user/*",
    ]);
  });
});
