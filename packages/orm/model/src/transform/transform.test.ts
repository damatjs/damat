import { describe, it, expect } from "bun:test";
import { model } from "./schema/model";
import {
  Category,
  User,
  Product,
  Order,
  OrderItem,
} from "./__fixtures__/models";

// ─────────────────────────────────────────────────────────────────────────────
// Snapshot tests — each sample model's full TableSchema is captured.
// On the first run bun writes the .snap file automatically.
// On subsequent runs the output is diffed against the stored snapshot.
// ─────────────────────────────────────────────────────────────────────────────

describe("transform snapshots", () => {
  it("Category schema", () => {
    expect(Category.toTableSchema()).toMatchSnapshot();
  });

  it("User schema (with postgres schema name + indexes)", () => {
    expect(User.toTableSchema()).toMatchSnapshot();
  });

  it("Product schema (decimal, enum, array, nullable FK)", () => {
    expect(Product.toTableSchema()).toMatchSnapshot();
  });

  it("Order schema (belongsTo User)", () => {
    expect(Order.toTableSchema()).toMatchSnapshot();
  });

  it("OrderItem schema (two belongsTo + composite unique index)", () => {
    expect(OrderItem.toTableSchema()).toMatchSnapshot();
  });

  it("minimal model snapshot", () => {
    const T = model.define("simple", { id: model.id().primaryKey() });
    expect(T.toTableSchema()).toMatchSnapshot();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Unit tests — targeted assertions against the sample models
// ─────────────────────────────────────────────────────────────────────────────

describe("transform", () => {
  // ── model.define ──────────────────────────────────────────────────────────

  describe("model.define", () => {
    it("sets table name", () => {
      expect(Category.toTableSchema().name).toBe("categories");
    });

    it("sets postgres schema name when provided", () => {
      expect(User.toTableSchema().schema).toBe("store");
    });

    it("omits schema when not provided", () => {
      expect(Category.toTableSchema().schema).toBeUndefined();
    });
  });

  // ── column types ──────────────────────────────────────────────────────────

  describe("column types", () => {
    it("id column emits text type with prefixed default", () => {
      const col = Category.toTableSchema().columns.find(
        (c) => c.name === "id",
      )!;
      expect(col.type).toBe("text");
      expect(col.default).toBe("generate_id('cat')");
      expect(col.primaryKey).toBe(true);
    });

    it("varchar column carries length", () => {
      const col = Category.toTableSchema().columns.find(
        (c) => c.name === "name",
      )!;
      expect(col.type).toBe("varchar");
      expect(col.length).toBe(128);
    });

    it("unique varchar column is marked unique", () => {
      const col = Category.toTableSchema().columns.find(
        (c) => c.name === "slug",
      )!;
      expect(col.unique).toBe(true);
    });

    it("nullable text column is marked nullable", () => {
      const col = Category.toTableSchema().columns.find(
        (c) => c.name === "description",
      )!;
      expect(col.nullable).toBe(true);
    });

    it("timestamptz column has correct type and default", () => {
      const col = Category.toTableSchema().columns.find(
        (c) => c.name === "createdAt",
      )!;
      expect(col.type).toBe("timestamptz");
      expect(col.default).toBe("now()");
    });

    it("boolean column with default false", () => {
      const col = User.toTableSchema().columns.find(
        (c) => c.name === "verified",
      )!;
      expect(col.type).toBe("boolean");
      expect(col.default).toBe("false");
    });

    it("jsonb column (binary: true)", () => {
      const col = User.toTableSchema().columns.find(
        (c) => c.name === "metadata",
      )!;
      expect(col.type).toBe("jsonb");
      expect(col.nullable).toBe(true);
    });

    it("decimal column carries precision and scale", () => {
      const col = Product.toTableSchema().columns.find(
        (c) => c.name === "price",
      )!;
      expect(col.type).toBe("decimal");
      expect(col.length).toBe(10);
      expect(col.scale).toBe(2);
    });

    it("number column with integer default value", () => {
      const col = Product.toTableSchema().columns.find(
        (c) => c.name === "stock",
      )!;
      expect(col.type).toBe("integer");
      expect(col.default).toBe("0");
    });

    it("enum column carries inline values", () => {
      const col = Product.toTableSchema().columns.find(
        (c) => c.name === "status",
      )!;
      expect(col.type).toBe("enum");
      expect(col.enumValues).toEqual(["draft", "active", "archived"]);
    });

    it("array text column is flagged as array and nullable", () => {
      const col = Product.toTableSchema().columns.find(
        (c) => c.name === "tags",
      )!;
      expect(col.array).toBe(true);
      expect(col.nullable).toBe(true);
    });

    it("json column (no options) uses json type", () => {
      const col = Product.toTableSchema().columns.find(
        (c) => c.name === "specs",
      )!;
      expect(col.type).toBe("json");
    });

    it("timestamp (no TZ option) uses timestamp type", () => {
      const col = Product.toTableSchema().columns.find(
        (c) => c.name === "createdAt",
      )!;
      expect(col.type).toBe("timestamp");
    });
  });

  // ── primary key ───────────────────────────────────────────────────────────

  describe("primary key", () => {
    it("single PK column is tracked", () => {
      expect(Order.toTableSchema().primaryKey.columns).toEqual(["id"]);
    });

    it("constraint name follows <table>_pkey convention", () => {
      expect(Order.toTableSchema().primaryKey.name).toBe("orders_pkey");
    });

    it("composite primary key lists all columns", () => {
      const Pivot = model.define("role_permissions", {
        roleId: model.text().primaryKey(),
        permId: model.text().primaryKey(),
      });
      const pk = Pivot.toTableSchema().primaryKey;
      expect(pk.columns).toContain("roleId");
      expect(pk.columns).toContain("permId");
      expect(pk.columns).toHaveLength(2);
    });
  });

  // ── indexes ───────────────────────────────────────────────────────────────

  describe("indexes", () => {
    it("User has two indexes", () => {
      expect(User.toTableSchema().indexes).toHaveLength(2);
    });

    it("named unique index is emitted correctly", () => {
      const idx = User.toTableSchema().indexes.find(
        (i) => i.name === "uniq_users_email",
      )!;
      expect(idx.unique).toBe(true);
      expect(idx.columns[0]!.name).toBe("email");
    });

    it("auto-named non-unique index", () => {
      const idx = User.toTableSchema().indexes.find(
        (i) => i.name === "idx_users_created_at",
      )!;
      expect(idx.unique).toBe(false);
    });

    it("Product sku unique index is auto-named with uniq_ prefix", () => {
      const idx = Product.toTableSchema().indexes.find((i) =>
        i.name.includes("sku"),
      )!;
      expect(idx.unique).toBe(true);
      expect(idx.name).toMatch(/^uniq_/);
    });

    it("multi-column index lists columns in order with type", () => {
      const idx = Product.toTableSchema().indexes.find((i) =>
        i.columns.some((c) => c.name === "status"),
      )!;
      expect(idx.columns.map((c) => c.name)).toEqual(["status", "createdAt"]);
      expect(idx.type).toBe("btree");
    });

    it("OrderItem has a named composite unique index", () => {
      const idx = OrderItem.toTableSchema().indexes.find(
        (i) => i.name === "uniq_order_items_order_product",
      )!;
      expect(idx.unique).toBe(true);
      expect(idx.columns.map((c) => c.name)).toEqual([
        "order_id",
        "product_id",
      ]);
    });

    it("no indexes when none are defined", () => {
      expect(Category.toTableSchema().indexes).toHaveLength(0);
    });
  });

  // ── belongsTo / foreign keys ──────────────────────────────────────────────

  describe("belongsTo / foreign keys", () => {
    it("Order has a user_id FK column", () => {
      const cols = Order.toTableSchema().columns.map((c) => c.name);
      expect(cols).toContain("user_id");
    });

    it("Order FK column is text type", () => {
      const col = Order.toTableSchema().columns.find(
        (c) => c.name === "user_id",
      )!;
      expect(col.type).toBe("text");
    });

    it("Order FK constraint references users table", () => {
      const fk = Order.toTableSchema().foreignKeys.find(
        (f) => f.name === "fk_orders_user_id",
      )!;
      expect(fk.referencedTable).toBe("users");
      expect(fk.referencedColumns).toEqual(["id"]);
    });

    it("FK default onDelete is SET NULL", () => {
      const fk = Order.toTableSchema().foreignKeys[0]!;
      expect(fk.onDelete).toBe("SET NULL");
    });

    it("Product has nullable FK column (category_id)", () => {
      const col = Product.toTableSchema().columns.find(
        (c) => c.name === "category_id",
      )!;
      expect(col.nullable).toBe(true);
    });

    it("Product FK constraint references categories table", () => {
      const fk = Product.toTableSchema().foreignKeys.find((f) =>
        f.columns.includes("category_id"),
      )!;
      expect(fk.referencedTable).toBe("categories");
    });

    it("OrderItem has two FK columns (order_id and product_id)", () => {
      const colNames = OrderItem.toTableSchema().columns.map((c) => c.name);
      expect(colNames).toContain("order_id");
      expect(colNames).toContain("product_id");
    });

    it("OrderItem has two FK constraints", () => {
      expect(OrderItem.toTableSchema().foreignKeys).toHaveLength(2);
    });

    it("hasMany does not create a column on the owner side", () => {
      const colNames = User.toTableSchema().columns.map((c) => c.name);
      expect(colNames).not.toContain("orders");
      expect(colNames).not.toContain("orders_id");
    });
  });
});
