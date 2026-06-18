import { describe, test, expect } from "bun:test";
import { renderLinkAugmentations } from "../codegen";
import { resolveLinkMigrationModules } from "../config";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

describe("renderLinkAugmentations", () => {
  test("merges a linked field onto the local interface via declaration merging", () => {
    const [file] = renderLinkAugmentations([
      {
        localTable: "users",
        field: "organizations",
        otherTable: "organizations",
        importPath: "../../organization/types",
        isList: true,
      },
    ]);

    expect(file!.fileName).toBe("users.links.ts");
    expect(file!.indexExport).toBe("users.links");
    expect(file!.content).toContain(
      `import type { Organizations } from "../../organization/types";`,
    );
    expect(file!.content).toContain(`declare module "./users" {`);
    expect(file!.content).toContain(`interface Users {`);
    expect(file!.content).toContain(`organizations?: Organizations[];`);
    expect(file!.content).toContain(`export {};`);
  });

  test("non-list links use a nullable single reference", () => {
    const [file] = renderLinkAugmentations([
      {
        localTable: "carts",
        field: "customer",
        otherTable: "customers",
        importPath: "../../customer/types",
        isList: false,
      },
    ]);
    expect(file!.content).toContain(`customer?: Customers | null;`);
  });

  test("groups multiple links on one table into a single file with combined imports", () => {
    const files = renderLinkAugmentations([
      { localTable: "users", field: "organizations", otherTable: "organizations", importPath: "../../organization/types", isList: true },
      { localTable: "users", field: "teams", otherTable: "teams", importPath: "../../team/types", isList: true },
    ]);
    expect(files).toHaveLength(1);
    expect(files[0]!.content).toContain("organizations?: Organizations[];");
    expect(files[0]!.content).toContain("teams?: Teams[];");
  });
});

describe("resolveLinkMigrationModules", () => {
  test("returns one link:<owner> entry per owner directory that has an index", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "links-"));
    fs.mkdirSync(path.join(root, "links", "user"), { recursive: true });
    fs.writeFileSync(path.join(root, "links", "user", "index.ts"), "export const models = {};");
    fs.mkdirSync(path.join(root, "links", "empty"), { recursive: true }); // no index → ignored

    const entries = resolveLinkMigrationModules("./links", root);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.id).toBe("link:user");
    expect(entries[0]!.resolve).toBe(path.join(root, "links", "user"));

    fs.rmSync(root, { recursive: true, force: true });
  });

  test("returns nothing when links is undefined", () => {
    expect(resolveLinkMigrationModules(undefined, process.cwd())).toEqual([]);
  });
});
