import { describe, it, expect } from "bun:test";
import { join } from "node:path";
import { augmentWithLinks } from "../codegen/augmentWithLinks";

// augmentWithLinks dynamically imports module/link sources via pathToFileURL, so
// it needs REAL files on disk — the __fixtures__ here export `models` / `links`
// in the shape the function expects. It touches no node:fs, so no setup mock is
// needed and @damatjs/link is used for real (renderLinkAugmentations).
const FIX = join(import.meta.dir, "__fixtures__");
const userModels = join(FIX, "userModels.ts");
const orgModels = join(FIX, "orgModels.ts");
const linkMod = join(FIX, "userOrgLink.ts");
const badLink = join(FIX, "badLink.ts");
const badLinkModule = join(FIX, "badLinkModule.ts");

function makeLogger() {
  const warnings: string[] = [];
  return { warn: (m: string) => warnings.push(m), warnings };
}

describe("augmentWithLinks", () => {
  it("no-ops when there are no link modules", async () => {
    const logger = makeLogger();
    const filesMap = new Map<string, string>();
    await augmentWithLinks(
      {
        modules: { user: { resolve: userModels } },
        moduleName: "user",
        logger,
      },
      filesMap,
    );
    expect(filesMap.size).toBe(0);
    expect(logger.warnings).toEqual([]);
  });

  it("weaves the linked field and re-exports it from index.ts", async () => {
    const logger = makeLogger();
    const filesMap = new Map<string, string>([["index.ts", "// base\n"]]);
    await augmentWithLinks(
      {
        modules: {
          user: { resolve: userModels },
          organization: { resolve: orgModels },
          userOrgLink: { resolve: linkMod, kind: "link" },
        },
        moduleName: "user",
        logger,
      },
      filesMap,
    );
    // A `<table>.links.ts` augmentation was added and index.ts re-exports it.
    const linkFile = [...filesMap.keys()].find((k) => k.endsWith(".links.ts"));
    expect(linkFile).toBeDefined();
    expect(filesMap.get("index.ts")).toContain("export * from");
    expect(logger.warnings).toEqual([]);
  });

  it("starts the index from empty when no base index.ts exists", async () => {
    const logger = makeLogger();
    const filesMap = new Map<string, string>();
    await augmentWithLinks(
      {
        modules: {
          user: { resolve: userModels },
          organization: { resolve: orgModels },
          userOrgLink: { resolve: linkMod, kind: "link" },
        },
        // Match the OTHER side too — both directions are iterated.
        moduleName: "organization",
        logger,
      },
      filesMap,
    );
    expect([...filesMap.keys()].some((k) => k.endsWith(".links.ts"))).toBe(true);
    expect(filesMap.get("index.ts")).toContain("export * from");
  });

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
    expect(logger.warnings.some((w) => w.includes("Could not load links"))).toBe(
      true,
    );
    expect(filesMap.size).toBe(0);
  });
});
