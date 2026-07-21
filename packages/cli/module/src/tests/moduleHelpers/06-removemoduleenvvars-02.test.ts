import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, writeCalls, describe, it, expect } from "./context";

describe("removeModuleEnvVars", () => {
  const get = async () =>
    (await import("../../commands/module/helpers/env")).removeModuleEnvVars;

  it("removes a block at the end of the file, plus its preceding blank line", async () => {
    fsState.existsMap = { "/app/.env.example": true };
    fsState.readFileMap = {
      "/app/.env.example":
        "BASE=1\n\n# --- module: user ---\n# key\nAPI_KEY=abc\nDB_URL=\n",
    };
    const fn = await get();
    expect(fn("/app", "user")).toEqual(["API_KEY", "DB_URL"]);
    const written = writeCalls.find((c) => c.path === "/app/.env.example");
    expect(written!.content).toBe("BASE=1\n");
  });
});
