import { describe, it, expect, beforeEach } from "bun:test";
import { ModelRegistry, ModelRegistryError } from "../registry";
import { FakeLogger, makeModel } from "./helpers";

// The registry instance under test is created fresh in beforeEach, so each test
// starts from an empty Map (no cross-test state leakage). The injected
// FakeLogger lets us assert on logging behavior without real console output.
let logger: FakeLogger;
let registry: ModelRegistry;

beforeEach(() => {
  logger = new FakeLogger();
  registry = new ModelRegistry(logger);
});

describe("ModelRegistry › register", () => {
  it("stores an entry retrievable by name with derived fields", () => {
    const model = makeModel({
      tableName: "users",
      schemaName: "store",
      columns: ["id", "email", "name"],
    });

    registry.register("User", model);

    const entry = registry.get("User");
    expect(entry).toBeDefined();
    expect(entry!.model).toBe(model);
    expect(entry!.tableName).toBe("users");
    expect(entry!.schema).toBe("store");
    expect(entry!.columns).toEqual(["id", "email", "name"]);
  });

  it("leaves schema undefined when the model has no schema name", () => {
    registry.register("Cat", makeModel({ tableName: "cats", columns: ["id"] }));
    expect(registry.get("Cat")!.schema).toBeUndefined();
  });

  it("extracts an empty column list for a model with no columns", () => {
    registry.register("Empty", makeModel({ tableName: "empty" }));
    expect(registry.get("Empty")!.columns).toEqual([]);
  });

  it("logs a debug message on registration with column count and schema", () => {
    registry.register(
      "User",
      makeModel({
        tableName: "users",
        schemaName: "store",
        columns: ["id", "email"],
      }),
    );

    const debugCalls = logger.callsTo("debug");
    expect(debugCalls).toHaveLength(1);
    expect(debugCalls[0]!.args[0]).toBe("Registered model: User -> users");
    expect(debugCalls[0]!.args[1]).toEqual({ columns: 2, schema: "store" });
  });

  it('defaults the logged schema to "public" when none is set', () => {
    registry.register("Cat", makeModel({ tableName: "cats", columns: ["id"] }));
    const [, ctx] = logger.callsTo("debug")[0]!.args;
    expect(ctx).toEqual({ columns: 1, schema: "public" });
  });

  it("overwrites an existing entry registered under the same name (last write wins)", () => {
    registry.register(
      "User",
      makeModel({ tableName: "users_v1", columns: ["id"] }),
    );
    registry.register(
      "User",
      makeModel({ tableName: "users_v2", columns: ["id", "x"] }),
    );

    const entry = registry.get("User");
    expect(entry!.tableName).toBe("users_v2");
    expect(entry!.columns).toEqual(["id", "x"]);
    // Still only one model name, even though it was registered twice.
    expect(registry.getModelNames()).toEqual(["User"]);
  });
});

describe("ModelRegistry › registerMany", () => {
  it("registers every entry in the record", () => {
    registry.registerMany({
      User: makeModel({ tableName: "users", columns: ["id"] }),
      Post: makeModel({ tableName: "posts", columns: ["id", "title"] }),
    });

    expect(registry.has("User")).toBe(true);
    expect(registry.has("Post")).toBe(true);
    expect(registry.getModelNames().sort()).toEqual(["Post", "User"]);
    expect(logger.callsTo("debug")).toHaveLength(2);
  });

  it("is a no-op for an empty record", () => {
    registry.registerMany({});
    expect(registry.getModelNames()).toEqual([]);
    expect(logger.callsTo("debug")).toHaveLength(0);
  });
});

describe("ModelRegistry › get / has", () => {
  it("returns undefined for an unregistered name (does not throw)", () => {
    expect(registry.get("Missing")).toBeUndefined();
  });

  it("has() reports presence accurately", () => {
    expect(registry.has("User")).toBe(false);
    registry.register("User", makeModel({ tableName: "users" }));
    expect(registry.has("User")).toBe(true);
    expect(registry.has("user")).toBe(false); // case-sensitive
  });
});

describe("ModelRegistry › getByTableName", () => {
  beforeEach(() => {
    registry.register(
      "User",
      makeModel({ tableName: "users", columns: ["id"] }),
    );
  });

  it("resolves an entry from its table name", () => {
    const entry = registry.getByTableName("users");
    expect(entry).toBeDefined();
    expect(entry!.tableName).toBe("users");
  });

  it("returns undefined for an unknown table name", () => {
    expect(registry.getByTableName("nope")).toBeUndefined();
  });

  it("keeps the table-name index in sync after an overwrite under a new table", () => {
    // Re-registering under the same model name but a different table name adds a
    // second table-index entry; the old table name still points at the (now
    // overwritten) model name, demonstrating current index behavior.
    registry.register(
      "User",
      makeModel({ tableName: "members", columns: ["id"] }),
    );

    expect(registry.getByTableName("members")!.tableName).toBe("members");
    // Old table name still maps to model name "User", which now resolves to the
    // updated entry (the Map only keeps one entry per model name).
    expect(registry.getByTableName("users")!.tableName).toBe("members");
  });
});

describe("ModelRegistry › getColumns", () => {
  it("returns the columns for a registered model", () => {
    registry.register(
      "User",
      makeModel({ tableName: "users", columns: ["id", "email"] }),
    );
    expect(registry.getColumns("User")).toEqual(["id", "email"]);
  });

  it("returns an empty array for an unknown model (never undefined)", () => {
    expect(registry.getColumns("Missing")).toEqual([]);
  });
});

describe("ModelRegistry › listing & iteration", () => {
  beforeEach(() => {
    registry.register(
      "User",
      makeModel({ tableName: "users", columns: ["id"] }),
    );
    registry.register(
      "Post",
      makeModel({ tableName: "posts", columns: ["id"] }),
    );
  });

  it("getModelNames lists names in insertion order", () => {
    expect(registry.getModelNames()).toEqual(["User", "Post"]);
  });

  it("getTableNames lists table names in insertion order", () => {
    expect(registry.getTableNames()).toEqual(["users", "posts"]);
  });

  it("getAll returns the live backing Map", () => {
    const all = registry.getAll();
    expect(all).toBeInstanceOf(Map);
    expect(all.size).toBe(2);
    expect(all.get("User")!.tableName).toBe("users");
    // Documented current behavior: getAll exposes the internal Map by reference,
    // so external mutation leaks into the registry.
    all.delete("Post");
    expect(registry.has("Post")).toBe(false);
  });
});

describe("ModelRegistry › resolveRelation", () => {
  it("returns undefined when the source model is not registered", () => {
    expect(registry.resolveRelation("Ghost", "author")).toBeUndefined();
  });

  it("returns undefined when the source model has no matching relation", () => {
    registry.register("Post", makeModel({ tableName: "posts", relations: [] }));
    expect(registry.resolveRelation("Post", "author")).toBeUndefined();
  });

  it("resolves the target entry by table name when the relation's property name matches", () => {
    // resolveRelation matches on the relation's `from` value (the property name
    // on this model, e.g. "author"), then follows `to: "authors"` to look up the
    // target entry by table name.
    registry.register(
      "Author",
      makeModel({ tableName: "authors", columns: ["id"] }),
    );
    registry.register(
      "Post",
      makeModel({
        tableName: "posts",
        relations: [
          {
            fromTable: "posts",
            from: "author",
            to: "authors",
            type: "belongsTo",
          },
        ],
      }),
    );

    // "author" is the relation's property name (`from`), so the find matches and
    // the relation's `to: "authors"` is used to look up the target.
    const resolved = registry.resolveRelation("Post", "author");
    expect(resolved).toBeDefined();
    expect(resolved!.tableName).toBe("authors");
  });

  it("returns undefined when the matched relation points at an unregistered table", () => {
    registry.register(
      "Post",
      makeModel({
        tableName: "posts",
        relations: [
          {
            fromTable: "posts",
            from: "author",
            to: "authors",
            type: "belongsTo",
          },
        ],
      }),
    );
    // The property name "author" matches the relation, but table "authors" is
    // not registered, so getByTableName returns undefined.
    expect(registry.resolveRelation("Post", "author")).toBeUndefined();
  });

  it('does NOT match on a RelationSchema key such as "from" or "to"', () => {
    // The lookup is by the relation's property name (its `from` value), NOT by
    // the keys of the RelationSchema object. Passing a key name like "from" or
    // "to" must not match any relation.
    registry.register(
      "Author",
      makeModel({ tableName: "authors", columns: ["id"] }),
    );
    registry.register(
      "Post",
      makeModel({
        tableName: "posts",
        relations: [
          {
            fromTable: "posts",
            from: "author",
            to: "authors",
            type: "belongsTo",
          },
        ],
      }),
    );
    expect(registry.resolveRelation("Post", "from")).toBeUndefined();
    expect(registry.resolveRelation("Post", "to")).toBeUndefined();
  });
});

describe("ModelRegistry › isolation between instances", () => {
  it("two registries do not share state", () => {
    const other = new ModelRegistry(new FakeLogger());
    registry.register("User", makeModel({ tableName: "users" }));
    expect(registry.has("User")).toBe(true);
    expect(other.has("User")).toBe(false);
  });
});

describe("ModelRegistryError", () => {
  it("is an Error subclass with the right name and message", () => {
    const err = new ModelRegistryError("boom");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ModelRegistryError);
    expect(err.name).toBe("ModelRegistryError");
    expect(err.message).toBe("boom");
  });

  it("is throwable and catchable as a ModelRegistryError", () => {
    expect(() => {
      throw new ModelRegistryError("nope");
    }).toThrow(ModelRegistryError);
  });
});
