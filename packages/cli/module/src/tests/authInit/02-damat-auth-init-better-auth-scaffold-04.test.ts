import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { state, describe, test, expect, run } from "./context";

describe("damat auth init better-auth — scaffold", () => {
  test("warns when damat.config.ts can't be updated automatically", async () => {
    state.existsDefault = false; // no config file
    const { result, logger } = run(["better-auth"]);
    expect((await result).exitCode).toBe(0);
    expect(
      logger.warn.mock.calls.some((c) =>
        String(c[0]).includes("Could not update damat.config.ts"),
      ),
    ).toBe(true);
  });
});
