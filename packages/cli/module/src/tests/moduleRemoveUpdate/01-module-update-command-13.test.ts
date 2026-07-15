import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, describe, it, expect, createContext } from "./context";

describe("module update command", () => {
  const get = async () =>
    (await import("../../commands/module/update")).moduleUpdateCommand;

  it("warns when the provenance cannot be re-registered", async () => {
    // A config the reader can parse but the writer cannot safely re-edit after
    // the entry is spliced out (no modules block, no defineConfig closing).
    fsState.existsMap = {
      "/app/damat.config.ts": true,
      "/app/src/modules/user": true,
      "/pkg": true,
    };
    fsState.readFileMap = {
      "/app/damat.config.ts": `const cfg = {
  user: {
    resolve: "./src/modules/user",
    id: "user",
    source: {
      type: "path",
      ref: "/pkg",
    },
  },
};
export default cfg;
`,
    };
    const cmd = await get();
    const { ctx, logger } = createContext(
      { dir: "src/modules", yes: true, "allow-unverified": true },
      { args: ["user"], cwd: "/app" },
    );
    const res = await cmd.handler(ctx);
    expect(res.exitCode).toBe(0);
    expect(
      logger.warn.mock.calls.some((c) =>
        String(c[0]).includes("Could not update damat.config.ts"),
      ),
    ).toBe(true);
  });
});
