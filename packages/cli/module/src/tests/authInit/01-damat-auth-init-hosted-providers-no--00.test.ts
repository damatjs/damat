import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { writeCalls, describe, test, expect, run } from "./context";

describe("damat auth init — hosted providers (no scaffold)", () => {
  for (const provider of ["clerk", "auth0"]) {
    test(`${provider} prints "no local tables" and writes nothing`, async () => {
      const { result, logger } = run([provider]);
      expect((await result).exitCode).toBe(0);
      expect(writeCalls).toHaveLength(0);
      const info = logger.info.mock.calls.map((c) => String(c[0])).join("\n");
      expect(info).toContain("hosted provider");
      expect(info).toContain(`@damatjs/auth-${provider}`);
    });
  }
});
