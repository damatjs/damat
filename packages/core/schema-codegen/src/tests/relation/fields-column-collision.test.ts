import { describe, expect, it } from "bun:test";
import type { ModuleSchema } from "@damatjs/orm-type";
import { generateTypes } from "../../index";
import { relationFields } from "../../relation/relationFields";

const relation = {
  fromTable: "registry_dist_tags",
  from: "package",
  to: "registry_packages",
  type: "belongsTo" as const,
  linkedBy: ["packageId"],
};

describe("belongsTo relation field collisions", () => {
  it("uses the model property when the FK name is a concrete column", () => {
    expect(relationFields([relation], ["packageId"])).toEqual([
      "  package?: RegistryPackages;",
    ]);
  });

  it("keeps the scalar FK and emits a distinct loaded relation", () => {
    const schema: ModuleSchema = {
      moduleName: "registry",
      tables: [
        {
          name: "registry_dist_tags",
          columns: [
            { name: "id", type: "uuid", nullable: false, primaryKey: true },
            { name: "packageId", type: "uuid", nullable: false },
          ],
        },
      ],
      relationships: [relation],
    };
    const output = generateTypes(schema, { banner: false });
    expect(output).toContain("  packageId: string;");
    expect(output).toContain("  package?: RegistryPackages;");
    expect(output).not.toContain("  packageId?: RegistryPackages;");
  });
});
