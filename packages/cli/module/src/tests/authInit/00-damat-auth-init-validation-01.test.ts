import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { describe, test, expect, run } from "./context";

describe("damat auth init — validation", () => {
  test("rejects an unknown provider", async () => {
    const { result, logger } = run(["okta"]);
    expect((await result).exitCode).toBe(1);
    expect(logger.error.mock.calls[0]![0]).toContain('Unknown provider "okta"');
  });
});
