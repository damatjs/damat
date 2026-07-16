import { describe, it, expect } from "bun:test";
import { ModuleSchema } from "@damatjs/orm-type";
import { generateTypes } from "../index";

describe("generateTypes › relations and edge cases", () => {
  it("adds optional belongsTo / hasMany / hasOne relation fields", () => {
    const schema: ModuleSchema = {
      moduleName: "blog",
      tables: [
        {
          name: "user",
          columns: [
            { name: "id", type: "uuid", nullable: false, primaryKey: true },
          ],
        },
      ],
      relationships: [
        {
          fromTable: "user",
          from: "profile",
          to: "profile",
          type: "hasOne",
          linkedBy: [],
        },
        {
          fromTable: "user",
          from: "posts",
          to: "post",
          type: "hasMany",
          linkedBy: [],
        },
        {
          fromTable: "user",
          from: "org",
          to: "organization",
          type: "belongsTo",
          linkedBy: ["organization_id"],
        },
      ],
    };
    const out = generateTypes(schema, { banner: false });
    expect(out).toContain("  // loaded relations");
    expect(out).toContain("  profile?: Profile;");
    expect(out).toContain("  posts?: Post[];");
    expect(out).toContain("  organization?: Organization;");
  });
});
