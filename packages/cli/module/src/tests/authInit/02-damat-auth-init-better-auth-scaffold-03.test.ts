import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { state, describe, test, expect, run, written } from "./context";

describe("damat auth init better-auth — scaffold", () => {
  test("overwrites with --force", async () => {
    state.existsMap["/app/src/modules/auth"] = true;
    const { result } = run(["better-auth"], { force: true });
    expect((await result).exitCode).toBe(0);
    expect(written("src/modules/auth/index.ts")).toBeDefined();
  });
});
