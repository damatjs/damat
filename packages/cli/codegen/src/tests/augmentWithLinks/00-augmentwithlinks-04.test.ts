import {
  describe,
  it,
  expect,
  augmentWithLinks,
  userModels,
  linkMod,
  badLink,
  makeLogger,
} from "./context";

describe("augmentWithLinks", () => {
  it("warns 'augmentation skipped' when resolving a linked model throws", async () => {
    const logger = makeLogger();
    const filesMap = new Map<string, string>();
    await augmentWithLinks(
      {
        modules: {
          user: { resolve: userModels },
          // The link loads fine, but resolving the OTHER side's models throws,
          // outside the per-link-module try → the outer catch logs and returns.
          organization: { resolve: badLink },
          userOrgLink: { resolve: linkMod, kind: "link" },
        },
        moduleName: "user",
        logger,
      },
      filesMap,
    );
    expect(
      logger.warnings.some((w) => w.includes("Link type augmentation skipped")),
    ).toBe(true);
    expect(filesMap.size).toBe(0);
  });
});
