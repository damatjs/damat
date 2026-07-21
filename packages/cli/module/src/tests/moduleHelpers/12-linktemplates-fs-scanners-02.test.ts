import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import { fsState, describe, it, expect } from "./context";

describe("linkTemplates fs scanners", () => {
  it("listOwnerDirs returns [] when the links dir is missing", async () => {
    fsState.existsDefault = false;
    const { listOwnerDirs } =
      await import("../../commands/module/helpers/linkTemplates");
    expect(listOwnerDirs("/links")).toEqual([]);
  });
});
