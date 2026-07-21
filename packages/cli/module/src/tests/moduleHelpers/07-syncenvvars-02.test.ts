import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, describe, it, expect } from "./context";

describe("syncEnvVars", () => {
  const get = async () =>
    (await import("../../commands/module/helpers/env")).syncEnvVars;

  it("treats absent files as empty content (everything is added/missing)", async () => {
    fsState.existsDefault = false;
    const fn = await get();
    const res = fn("/app", {
      name: "demo",
      env: [{ name: "DB_URL" }],
    } as never);
    expect(res.addedToExample).toEqual(["DB_URL"]);
    expect(res.missingInEnv).toEqual(["DB_URL"]); // required defaults to true
  });
});
