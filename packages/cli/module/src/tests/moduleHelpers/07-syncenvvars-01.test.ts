import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, appendCalls, describe, it, expect } from "./context";

describe("syncEnvVars", () => {
  const get = async () =>
    (await import("../../commands/module/helpers/env")).syncEnvVars;

  it("appends missing vars to .env.example and reports those missing from .env", async () => {
    fsState.existsMap = { "/app/.env.example": true, "/app/.env": true };
    fsState.readFileMap = {
      "/app/.env.example": "EXISTING=1\n",
      "/app/.env": "EXISTING=1\n",
    };
    const fn = await get();
    const res = fn("/app", {
      name: "demo",
      env: [
        { name: "EXISTING", required: true },
        { name: "API_KEY", description: "key", example: "abc", required: true },
        { name: "OPTIONAL", required: false },
      ],
    } as never);
    // EXISTING already in both → not added, not missing.
    expect(res.addedToExample).toContain("API_KEY");
    expect(res.addedToExample).toContain("OPTIONAL");
    expect(res.missingInEnv).toContain("API_KEY");
    expect(res.missingInEnv).not.toContain("OPTIONAL"); // not required
    const appended = appendCalls.find((a) => a.path === "/app/.env.example");
    expect(appended!.content).toContain("API_KEY=abc");
    expect(appended!.content).toContain("# key");
  });
});
