import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { state, writeCalls, describe, test, expect, run } from "./context";

describe("damat auth init better-auth — scaffold", () => {
  test("refuses when the module already exists without --force", async () => {
    state.existsMap["/app/src/modules/auth"] = true;
    const { result, logger } = run(["better-auth"]);
    expect((await result).exitCode).toBe(1);
    expect(logger.error.mock.calls[0]![0]).toContain("already exists");
    expect(writeCalls).toHaveLength(0);
  });
});
