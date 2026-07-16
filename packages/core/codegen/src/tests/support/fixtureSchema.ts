import type { ModuleSchema } from "@damatjs/orm-type";

export const fixtureSchema: ModuleSchema = {
  moduleName: "golden",
  tables: [
    {
      name: "users",
      columns: [
        { name: "id", type: "uuid", nullable: false, primaryKey: true },
        { name: "name", type: "text", nullable: false },
      ],
    },
    {
      name: "posts",
      columns: [
        { name: "id", type: "uuid", nullable: false, primaryKey: true },
        {
          name: "status",
          type: "enum",
          enum: "post_status",
          nullable: false,
        },
        { name: "summary", type: "text", nullable: true },
        { name: "tags", type: "text", nullable: false, array: true },
        { name: "author_id", type: "uuid", nullable: false },
      ],
    },
  ],
  enums: [{ name: "post_status", values: ["draft", "published"] }],
  relationships: [
    {
      fromTable: "posts",
      from: "author",
      to: "users",
      type: "belongsTo",
      linkedBy: ["author_id"],
    },
  ],
};
