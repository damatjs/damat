import { beforeEach as registerReset } from "bun:test";
import { resetContext } from "./context";
registerReset(resetContext);

import {
  fsState,
  mockReaddirSync,
  mockStatSync,
  describe,
  it,
  expect,
} from "./context";

describe("linkTemplates fs scanners", () => {
  it("listOwnerDirs returns sorted owner dirs that contain an index.ts", async () => {
    // /links exists; user (dir w/ index), billing (dir w/o index), file (not dir,
    // statSync throws).
    fsState.existsMap = {
      "/links": true,
      "/links/user/index.ts": true,
      "/links/billing/index.ts": false,
    };
    mockReaddirSync.mockImplementationOnce(() => ["user", "billing", "afile"]);
    mockStatSync.mockImplementation((p: string) => {
      if (String(p).endsWith("afile")) throw new Error("ENOENT");
      return { isDirectory: () => true };
    });
    const { listOwnerDirs } =
      await import("../../commands/module/helpers/linkTemplates");
    expect(listOwnerDirs("/links")).toEqual(["user"]);
  });
});
