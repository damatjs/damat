import {
  describe,
  it,
  expect,
  augmentWithLinks,
  userModels,
  orgModels,
  badLinkModule,
  makeLogger,
} from "./context";

describe("augmentWithLinks", () => {
  it("warns but does not throw when a link module fails to load", async () => {
    const logger = makeLogger();
    const filesMap = new Map<string, string>();
    await augmentWithLinks(
      {
        modules: {
          user: { resolve: userModels },
          organization: { resolve: orgModels },
          broken: { resolve: badLinkModule, kind: "link" },
        },
        moduleName: "user",
        logger,
      },
      filesMap,
    );
    // The bad link is skipped with a warning; nothing is woven.
    expect(
      logger.warnings.some((w) => w.includes("Could not load links")),
    ).toBe(true);
    expect(filesMap.size).toBe(0);
  });
});
