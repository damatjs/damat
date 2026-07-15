import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { appendCalls, describe, it, expect } from "./context";

describe("syncEnvVars", () => {
  const get = async () =>
    (await import("../../commands/module/helpers/env")).syncEnvVars;

  it("returns empty when the manifest declares no env vars", async () => {
    const fn = await get();
    const res = fn("/app", { name: "demo" } as never);
    expect(res).toEqual({ addedToExample: [], missingInEnv: [] });
    expect(appendCalls).toHaveLength(0);
  });
});
