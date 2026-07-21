import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, describe, it, expect } from "./context";

describe("linkTemplates fs scanners", () => {
  it("listModelBasenames returns [] when the dir is missing", async () => {
    fsState.existsDefault = false;
    const { listModelBasenames } =
      await import("../../commands/module/helpers/linkTemplates");
    expect(listModelBasenames("/links/user/models")).toEqual([]);
  });
});
