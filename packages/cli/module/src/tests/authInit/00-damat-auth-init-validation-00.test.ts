import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { writeCalls, describe, test, expect, run } from "./context";

describe("damat auth init — validation", () => {
  test("requires a provider", async () => {
    const { result, logger } = run([]);
    expect((await result).exitCode).toBe(1);
    expect(logger.error).toHaveBeenCalled();
    expect(writeCalls).toHaveLength(0);
  });
});
