import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, mockReaddirSync, describe, it, expect } from "./context";

describe("linkTemplates fs scanners", () => {
  it("listModelBasenames returns sorted basenames excluding index.ts", async () => {
    fsState.existsMap = { "/links/user/models": true };
    mockReaddirSync.mockImplementationOnce(() => [
      "user-team.ts",
      "index.ts",
      "user-org.ts",
      "notes.md",
    ]);
    const { listModelBasenames } =
      await import("../../commands/module/helpers/linkTemplates");
    expect(listModelBasenames("/links/user/models")).toEqual([
      "user-org",
      "user-team",
    ]);
  });
});
