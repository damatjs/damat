import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, writeCalls, describe, it, expect } from "./context";

describe("deregisterModuleFromConfig", () => {
  const get = async () =>
    (await import("../../commands/module/helpers/config"))
      .deregisterModuleFromConfig;

  it("splices out the entry and leaves sibling entries intact", async () => {
    const config = `export default defineConfig({
  modules: {
    user: {
      resolve: "./src/modules/user",
      id: "user",
      source: {
        type: "path",
        ref: "/pkg",
      },
    },
    billing: {
      resolve: "./src/modules/billing",
      id: "billing",
    },
  },
});
`;
    fsState.existsMap = { "/app/damat.config.ts": true };
    fsState.readFileMap = { "/app/damat.config.ts": config };
    const fn = await get();
    expect(fn("/app/damat.config.ts", "user")).toBe(true);
    const written = writeCalls.find((c) => c.path === "/app/damat.config.ts");
    expect(written!.content).not.toContain("user:");
    expect(written!.content).not.toContain('"./src/modules/user"');
    expect(written!.content).toContain("billing:");
    expect(written!.content).toContain('resolve: "./src/modules/billing"');
    expect(written!.content).toContain("modules: {");
  });
});
