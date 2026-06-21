import { describe, test, expect } from "bun:test";
import { toModuleSchema } from "@damatjs/orm-model";
import { generateFilesMap } from "@damatjs/codegen";
import { defineLink } from "../defineLink";
import { collectLinkModels } from "../registry";

/**
 * Proves (without a database) that a junction model produced by `defineLink`
 * flows through the *existing* schema + codegen pipelines unchanged — which is
 * what makes links migrate and type-generate with zero ORM special-casing.
 */
describe("codegen pipeline", () => {
  test("junction models produce a module schema and generated types", () => {
    const link = defineLink(
      { module: "user", model: "user" },
      { module: "organization", model: "organization" },
    );
    const models = Object.values(collectLinkModels([link]));

    const schema = toModuleSchema("link", models);
    expect(schema.tables.map((t) => t.name)).toContain("user_organization");

    const files = generateFilesMap(schema, {});
    const content = files.get("user-organization.ts");
    expect(content).toBeDefined();
    expect(content).toContain("user_id");
    expect(content).toContain("organization_id");
    expect(content).toContain("NewUserOrganization");
  });
});
