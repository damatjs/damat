import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateTypes } from "../index";

describe("generateTypes relation wiring", () => {
  const table = (name: string): ModuleSchema["tables"][number] => ({
    name,
    columns: [{ name: "id", type: "uuid", nullable: false, primaryKey: true }],
  });

  it("emits a dangling type reference when the target model is missing", () => {
    // `relationFields` never validates `rel.to` against the model set: the
    // field is emitted anyway, referencing a `Categories` interface that is
    // never generated. No skip, no throw — a dangling name in the output.
    const schema: ModuleSchema = {
      moduleName: "blog",
      tables: [table("posts")],
      relationships: [
        {
          fromTable: "posts",
          from: "category",
          to: "categories",
          type: "belongsTo",
          linkedBy: ["category_id"],
        },
      ],
    };

    const content = generateTypes(schema, { banner: false });

    expect(content).toContain("category?: Categories;");
    expect(content).not.toContain("export interface Categories");
  });
});
