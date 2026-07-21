import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, writeCalls, describe, it, expect } from "./context";

describe("removeModuleEnvVars", () => {
  const get = async () =>
    (await import("../../commands/module/helpers/env")).removeModuleEnvVars;

  it("removes a middle block, preserving the following module's block", async () => {
    fsState.existsMap = { "/app/.env.example": true };
    fsState.readFileMap = {
      "/app/.env.example":
        "BASE=1\n\n# --- module: user ---\nAPI_KEY=abc\n\n# --- module: other ---\nOTHER=1\n",
    };
    const fn = await get();
    expect(fn("/app", "user")).toEqual(["API_KEY"]);
    const written = writeCalls.find((c) => c.path === "/app/.env.example");
    expect(written!.content).toBe(
      "BASE=1\n\n# --- module: other ---\nOTHER=1\n",
    );
  });
});
