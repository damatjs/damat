import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { describe, it, expect } from "./context";

describe("invalidPackageSpecs (packages.ts)", () => {
  const get = async () =>
    (await import("../../commands/module/helpers/packages"))
      .invalidPackageSpecs;

  it("rejects protocol/path ranges and whitespace by default", async () => {
    const fn = await get();
    for (const range of [
      "file:../../pwn",
      "git+https://github.com/a/b.git",
      "https://evil.example/x.tgz",
      "owner/repo",
      ">=1.0.0 <2.0.0",
    ]) {
      const bad = fn({ pkg: range });
      expect(bad).toHaveLength(1);
      expect(bad[0]).toContain("--allow-unverified");
    }
  });
});
