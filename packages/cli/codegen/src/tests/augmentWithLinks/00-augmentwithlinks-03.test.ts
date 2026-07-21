import {
  describe,
  it,
  expect,
  augmentWithLinks,
  userModels,
  orgModels,
  linkMod,
  makeLogger,
} from "./context";

describe("augmentWithLinks", () => {
  it("produces no fields when the named module participates in no link", async () => {
    const logger = makeLogger();
    const filesMap = new Map<string, string>();
    await augmentWithLinks(
      {
        modules: {
          user: { resolve: userModels },
          organization: { resolve: orgModels },
          userOrgLink: { resolve: linkMod, kind: "link" },
        },
        moduleName: "unrelated",
        logger,
      },
      filesMap,
    );
    expect(filesMap.size).toBe(0);
  });
});
