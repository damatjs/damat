import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, describe, it, expect, mm } from "./context";

describe("resolveModuleSource (helpers/source.ts)", () => {
  const get = async () =>
    (await import("../../commands/module/helpers/source")).resolveModuleSource;

  it("resolves a registry ref to its indexed source", async () => {
    // Not an existing path → falls to registry. parseModuleRef matches; the
    // record's source is a local path that exists.
    fsState.existsMap = { "/cwd/.cache/user": true };
    mm.parseRef = { name: "user" };
    mm.registryRecord = {
      source: "/cwd/.cache/user",
      version: "1.0.0",
      owner: { namespace: "acme" },
      verification: { status: "verified" },
      integrity: "sha",
    };
    const fn = await get();
    const res = await fn("user", "/cwd");
    expect(res.dir).toBe("/cwd/.cache/user");
    expect(res.origin).toMatchObject({
      type: "registry",
      ref: "user",
      version: "1.0.0",
      owner: "acme",
      verification: "verified",
    });
    expect(res.registry).toBeDefined();
  });
});
