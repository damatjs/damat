import { describe, it, expect } from "bun:test";
import { ModuleSchema, RelationSchema } from "@damatjs/orm-type";
import { buildRelationMap } from "@/relation/map";
import { relationFields } from "../relation/relationFields";
import { generateTypes } from "../index";

describe("buildRelationMap", () => {
  it("groups relations by source table", () => {
    const relationships: RelationSchema[] = [
      {
        fromTable: "posts",
        from: "user",
        to: "users",
        type: "belongsTo",
        linkedBy: ["user_id"],
      },
      {
        fromTable: "posts",
        from: "comments",
        to: "comments",
        type: "hasMany",
        linkedBy: [],
      },
      {
        fromTable: "comments",
        from: "user",
        to: "users",
        type: "belongsTo",
        linkedBy: ["user_id"],
      },
    ];

    const map = buildRelationMap(relationships);

    expect(map.get("posts")?.length).toBe(2);
    expect(map.get("comments")?.length).toBe(1);
    expect(map.has("users")).toBe(false);
  });

  it("returns empty map for no relationships", () => {
    const map = buildRelationMap([]);
    expect(map.size).toBe(0);
  });

  it("handles multiple relations from same table", () => {
    const relationships: RelationSchema[] = [
      {
        fromTable: "orders",
        from: "user",
        to: "users",
        type: "belongsTo",
        linkedBy: ["user_id"],
      },
      {
        fromTable: "orders",
        from: "product",
        to: "products",
        type: "belongsTo",
        linkedBy: ["product_id"],
      },
      {
        fromTable: "orders",
        from: "payment",
        to: "payments",
        type: "hasOne",
        linkedBy: [],
      },
    ];

    const map = buildRelationMap(relationships);
    const orderRels = map.get("orders");

    expect(orderRels?.length).toBe(3);
  });

  it("groups a self-referencing relation under its own table", () => {
    const relationships: RelationSchema[] = [
      {
        fromTable: "categories",
        from: "parent",
        to: "categories",
        type: "belongsTo",
        linkedBy: ["parent_id"],
      },
      {
        fromTable: "categories",
        from: "children",
        to: "categories",
        type: "hasMany",
        linkedBy: [],
      },
    ];

    const map = buildRelationMap(relationships);

    // Both sides live under the one table key — self-reference is not special.
    expect(map.size).toBe(1);
    expect(map.get("categories")?.length).toBe(2);
  });

  it("keeps duplicate relations between the same pair, in insertion order", () => {
    const relationships: RelationSchema[] = [
      {
        fromTable: "posts",
        from: "author",
        to: "users",
        type: "belongsTo",
        linkedBy: ["author_id"],
      },
      {
        fromTable: "posts",
        from: "reviewer",
        to: "users",
        type: "belongsTo",
        linkedBy: ["reviewer_id"],
      },
    ];

    const map = buildRelationMap(relationships);
    const postRels = map.get("posts");

    expect(postRels?.length).toBe(2);
    // No dedupe/reorder — the map preserves the order relations were given in.
    expect(postRels?.map((r) => r.from)).toEqual(["author", "reviewer"]);
  });
});

describe("relationFields", () => {
  // The generated field TYPE is `toPascalCase(rel.to)` verbatim — the target
  // table name as-written. There is no singularisation, so a relation `to:
  // "users"` references the `Users` interface (which is what the row-interface
  // generator emits for a table named `users`). Field NAMES come from the FK
  // column (belongsTo, `_id` stripped) or `rel.from` (hasMany / hasOne).

  it("generates belongsTo field; name from FK column, type from rel.to", () => {
    const fields = relationFields([
      {
        fromTable: "posts",
        from: "author",
        to: "users",
        type: "belongsTo",
        linkedBy: ["user_id"],
      },
    ]);
    // FK `user_id` → name `user`; target `users` → type `Users`.
    expect(fields).toEqual(["  user?: Users;"]);
  });

  it("strips only a trailing _id from the FK column name", () => {
    const fields = relationFields([
      {
        fromTable: "orders",
        from: "owner",
        to: "users",
        type: "belongsTo",
        linkedBy: ["created_by_id"],
      },
    ]);
    expect(fields).toEqual(["  created_by?: Users;"]);
  });

  it("falls back to rel.from for belongsTo when linkedBy is empty", () => {
    const fields = relationFields([
      {
        fromTable: "posts",
        from: "author",
        to: "users",
        type: "belongsTo",
        linkedBy: [],
      },
    ]);
    // No FK column → use the property name `author`; type from `users`.
    expect(fields).toEqual(["  author?: Users;"]);
  });

  it("falls back to rel.from for belongsTo when linkedBy is undefined", () => {
    const fields = relationFields([
      {
        fromTable: "posts",
        from: "author",
        to: "users",
        type: "belongsTo",
      },
    ]);
    expect(fields).toEqual(["  author?: Users;"]);
  });

  it("generates hasMany field as an array using rel.from for the name", () => {
    const fields = relationFields([
      {
        fromTable: "users",
        from: "posts",
        to: "posts",
        type: "hasMany",
        linkedBy: [],
      },
    ]);
    // hasMany → array; name = rel.from; type = toPascalCase(rel.to).
    expect(fields).toEqual(["  posts?: Posts[];"]);
  });

  it("ignores linkedBy for hasMany, always using rel.from for the name", () => {
    const fields = relationFields([
      {
        fromTable: "users",
        from: "orders",
        to: "orders",
        type: "hasMany",
        linkedBy: ["user_id"],
      },
    ]);
    expect(fields).toEqual(["  orders?: Orders[];"]);
  });

  it("generates hasOne field as singular using rel.from for the name", () => {
    const fields = relationFields([
      {
        fromTable: "users",
        from: "profile",
        to: "profiles",
        type: "hasOne",
        linkedBy: [],
      },
    ]);
    expect(fields).toEqual(["  profile?: Profiles;"]);
  });

  it("PascalCases a snake_case target table name", () => {
    const fields = relationFields([
      {
        fromTable: "users",
        from: "orderItems",
        to: "order_items",
        type: "hasMany",
        linkedBy: [],
      },
    ]);
    expect(fields).toEqual(["  orderItems?: OrderItems[];"]);
  });

  it("uses rel.from verbatim as belongsTo name when no FK column", () => {
    const fields = relationFields([
      {
        fromTable: "items",
        from: "orderItem",
        to: "order_items",
        type: "belongsTo",
        linkedBy: [],
      },
    ]);
    expect(fields).toEqual(["  orderItem?: OrderItems;"]);
  });

  it("keeps a singular target name singular (no pluralisation applied)", () => {
    const fields = relationFields([
      {
        fromTable: "posts",
        from: "metadata",
        to: "metadata",
        type: "hasOne",
        linkedBy: [],
      },
    ]);
    expect(fields).toEqual(["  metadata?: Metadata;"]);
  });

  it("returns empty array for no relations", () => {
    expect(relationFields([])).toEqual([]);
  });

  it("handles multiple relations of every kind in order", () => {
    const fields = relationFields([
      {
        fromTable: "posts",
        from: "author",
        to: "users",
        type: "belongsTo",
        linkedBy: ["user_id"],
      },
      {
        fromTable: "posts",
        from: "comments",
        to: "comments",
        type: "hasMany",
        linkedBy: [],
      },
      {
        fromTable: "posts",
        from: "metadata",
        to: "metadata",
        type: "hasOne",
        linkedBy: [],
      },
    ]);

    expect(fields).toEqual([
      "  user?: Users;",
      "  comments?: Comments[];",
      "  metadata?: Metadata;",
    ]);
  });

  it("emits self-referencing fields typed as the table's own interface", () => {
    const fields = relationFields([
      {
        fromTable: "categories",
        from: "parent",
        to: "categories",
        type: "belongsTo",
        linkedBy: ["parent_id"],
      },
      {
        fromTable: "categories",
        from: "children",
        to: "categories",
        type: "hasMany",
        linkedBy: [],
      },
    ]);

    // fromTable === to: both fields point back at the `Categories` interface.
    expect(fields).toEqual([
      "  parent?: Categories;",
      "  children?: Categories[];",
    ]);
  });

  it("gives multiple relations to the same target distinct FK-derived names", () => {
    const fields = relationFields([
      {
        fromTable: "posts",
        from: "author",
        to: "users",
        type: "belongsTo",
        linkedBy: ["author_id"],
      },
      {
        fromTable: "posts",
        from: "reviewer",
        to: "users",
        type: "belongsTo",
        linkedBy: ["reviewer_id"],
      },
    ]);

    // Same target type twice — names disambiguated by the FK column.
    expect(fields).toEqual(["  author?: Users;", "  reviewer?: Users;"]);
  });

  it("PascalCases kebab-case and spaced target table names", () => {
    const fields = relationFields([
      {
        fromTable: "orders",
        from: "orderItems",
        to: "order-items",
        type: "hasMany",
        linkedBy: [],
      },
      {
        fromTable: "orders",
        from: "shippingLabel",
        to: "shipping label",
        type: "hasOne",
        linkedBy: [],
      },
    ]);
    expect(fields).toEqual([
      "  orderItems?: OrderItems[];",
      "  shippingLabel?: ShippingLabel;",
    ]);
  });

  it("uses an FK column verbatim when it has no trailing _id", () => {
    const fields = relationFields([
      {
        fromTable: "sessions",
        from: "user",
        to: "users",
        type: "belongsTo",
        linkedBy: ["user_uuid"],
      },
    ]);
    // Only a trailing `_id` is stripped — other suffixes stay as-is.
    expect(fields).toEqual(["  user_uuid?: Users;"]);
  });

  it("does not strip _id when it appears mid-name", () => {
    const fields = relationFields([
      {
        fromTable: "audits",
        from: "user",
        to: "users",
        type: "belongsTo",
        linkedBy: ["user_id_old"],
      },
    ]);
    expect(fields).toEqual(["  user_id_old?: Users;"]);
  });
});

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

  it("silently drops relations whose source table is not in the model set", () => {
    const schema: ModuleSchema = {
      moduleName: "blog",
      tables: [table("posts")],
      relationships: [
        {
          fromTable: "ghosts",
          from: "post",
          to: "posts",
          type: "belongsTo",
          linkedBy: ["post_id"],
        },
      ],
    };

    const content = generateTypes(schema, { banner: false });

    // Only tables in the set are iterated, so the orphan relation vanishes.
    expect(content).toContain("export interface Posts {");
    expect(content).not.toContain("loaded relations");
    expect(content).not.toContain("post?:");
  });

  it("renders a self-referencing relation inside its own interface", () => {
    const schema: ModuleSchema = {
      moduleName: "catalog",
      tables: [
        {
          name: "categories",
          columns: [
            { name: "id", type: "uuid", nullable: false, primaryKey: true },
            { name: "parent_id", type: "uuid", nullable: true },
          ],
        },
      ],
      relationships: [
        {
          fromTable: "categories",
          from: "parent",
          to: "categories",
          type: "belongsTo",
          linkedBy: ["parent_id"],
        },
        {
          fromTable: "categories",
          from: "children",
          to: "categories",
          type: "hasMany",
          linkedBy: [],
        },
      ],
    };

    const content = generateTypes(schema, { banner: false });

    expect(content).toContain("export interface Categories {");
    expect(content).toContain("  parent?: Categories;");
    expect(content).toContain("  children?: Categories[];");
  });
});
