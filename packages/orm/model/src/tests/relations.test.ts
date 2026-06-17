import { describe, it, expect } from "bun:test";
import { model } from "@/schema";
import { toModuleSchema } from "@/schema/toModuleSchema";
import { columns } from "@/properties";
import {
  UserSchema,
  OrderSchema,
  OrderItemSchema,
  ProductSchema,
  CategorySchema,
} from "./__fixtures__/models";

// ─────────────────────────────────────────────────────────────────────────────
// Relations — tested at the module level because `fromTable` (source table name)
// is only meaningful once all models are assembled into a ModuleSchema.
// ─────────────────────────────────────────────────────────────────────────────

describe("transform › relations (module level)", () => {
  it("hasMany relation: fromTable = source table, to = target table", () => {
    const module = toModuleSchema("test", [UserSchema, OrderSchema]);
    const rel = module.relationships?.find(
      (r) => r.type === "hasMany" && r.fromTable === "user",
    );
    expect(rel).toBeDefined();
    expect(rel!.fromTable).toBe("user");
    expect(rel!.from).toBe("orders");
    expect(rel!.to).toBe("order");
    expect(rel!.mappedBy).toEqual(["user"]);
  });

  it("belongsTo relation: fromTable = source table, to = target table", () => {
    const module = toModuleSchema("test", [CategorySchema, ProductSchema]);
    const rel = module.relationships?.find(
      (r) => r.type === "belongsTo" && r.fromTable === "product",
    );
    expect(rel).toBeDefined();
    expect(rel!.fromTable).toBe("product");
    expect(rel!.from).toBe("category");
    expect(rel!.to).toBe("category");
    expect(rel!.linkedBy).toEqual(["category_id"]);
  });

  it("belongsTo creates FK columns on the owning table", () => {
    const schema = OrderItemSchema.toTableSchema();
    expect(schema.relations).toHaveLength(2);
    expect(schema.columns.find((c) => c.name === "order_id")).toBeDefined();
    expect(schema.columns.find((c) => c.name === "product_id")).toBeDefined();
  });

  it("multiple belongsTo on one table produce one relation entry each", () => {
    const module = toModuleSchema("test", [
      OrderSchema,
      ProductSchema,
      OrderItemSchema,
    ]);
    const fromOrderItem = module.relationships?.filter(
      (r) => r.fromTable === "order_item",
    );
    expect(fromOrderItem).toHaveLength(2);
    expect(fromOrderItem?.map((r) => r.to).sort()).toEqual(
      ["order", "product"].sort(),
    );
  });

  it("hasMany without mappedBy omits mappedBy from relation", () => {
    const Child = model("child", { id: columns.id().primaryKey() });
    const Parent = model("parent", {
      id: columns.id().primaryKey(),
      children: columns.hasMany(() => Child),
    });
    const module = toModuleSchema("test", [Child, Parent]);
    const rel = module.relationships?.find((r) => r.fromTable === "parent");
    expect(rel).toBeDefined();
    expect(rel!.mappedBy).toBeUndefined();
  });

  it("hasMany accepts a string table name without resolving the target model", () => {
    // "comments_str" never gets a model defined — referencing it by table-name
    // string must still emit a relation that points at that table directly.
    const Post = model("posts_str", {
      id: columns.id().primaryKey(),
      comments: columns.hasMany("comments_str").mappedBy("post"),
    });
    const rel = Post.toTableSchema().relations?.find(
      (r) => r.type === "hasMany",
    )!;
    expect(rel.to).toBe("comments_str");
    expect(rel.mappedBy).toEqual(["post"]);
  });

  it("hasOne accepts a string table name without resolving the target model", () => {
    // "profiles_str" never gets a model defined.
    const Account = model("accounts_str", {
      id: columns.id().primaryKey(),
      profile: columns.hasOne("profiles_str").mappedBy("account"),
    });
    const rel = Account.toTableSchema().relations?.find(
      (r) => r.type === "hasOne",
    )!;
    expect(rel.to).toBe("profiles_str");
    expect(rel.mappedBy).toEqual(["account"]);
  });

  it("hasOne relation: fromTable = source table, to = target table", () => {
    const Profile = model("profile", { id: columns.id().primaryKey() });
    const Account = model("account", {
      id: columns.id().primaryKey(),
      profile: columns.hasOne(Profile).mappedBy("account"),
    });
    const module = toModuleSchema("test", [Profile, Account]);
    const rel = module.relationships?.find((r) => r.type === "hasOne");
    expect(rel).toBeDefined();
    expect(rel!.fromTable).toBe("account");
    expect(rel!.from).toBe("profile");
    expect(rel!.to).toBe("profile");
    expect(rel!.mappedBy).toEqual(["account"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// hasOne with a *string* target — like hasMany, the inverse side creates no DB
// artifact; it is pure ORM metadata. The target table is referenced by name
// without ever resolving a model.
// ─────────────────────────────────────────────────────────────────────────────

describe("transform › hasOne string target", () => {
  it("creates no FK column and no foreign key on the owner side", () => {
    const Account = model("accounts_no_col", {
      id: columns.id().primaryKey(),
      profile: columns.hasOne("profiles_str"),
    });
    const schema = Account.toTableSchema();
    expect(schema.columns.map((c) => c.name)).not.toContain("profiles_str_id");
    expect(schema.foreignKeys ?? []).toHaveLength(0);
  });

  it("without mappedBy omits mappedBy from the relation", () => {
    const Account = model("accounts_nomap", {
      id: columns.id().primaryKey(),
      profile: columns.hasOne("profiles_str"),
    });
    const rel = Account.toTableSchema().relations?.find(
      (r) => r.type === "hasOne",
    )!;
    expect(rel.to).toBe("profiles_str");
    expect(rel.mappedBy).toBeUndefined();
  });

  it("toTsType() returns the PascalCased table name", () => {
    expect(columns.hasOne("profiles_str").toTsType()).toBe("ProfilesStr");
  });
});
