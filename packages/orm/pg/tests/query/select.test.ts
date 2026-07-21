import { describe, it, expect } from "bun:test";
import { SelectBuilder } from "../../src/query/select";
import { UserModel, PostModel, NoSchemaModel } from "../helpers/fixtures";

const sel = () => new SelectBuilder(UserModel);

describe("SelectBuilder.generateSql — basics", () => {
  it("SELECT * FROM schema.table with no clauses", () => {
    const q = sel().generateSql();
    expect(q.sql).toBe('SELECT * FROM "app"."user"');
    expect(q.params).toEqual([]);
  });

  it("omits schema qualifier for a schema-less model", () => {
    const q = new SelectBuilder(NoSchemaModel).generateSql();
    expect(q.sql).toBe('SELECT * FROM "widget"');
  });

  it("explicit columns are quoted and comma-joined", () => {
    const q = sel().columns(["id", "email"]).generateSql();
    expect(q.sql).toBe('SELECT "id", "email" FROM "app"."user"');
  });

  it("DISTINCT prefix", () => {
    const q = sel().distinct().columns(["email"]).generateSql();
    expect(q.sql).toBe('SELECT DISTINCT "email" FROM "app"."user"');
  });

  it("throws on unknown column in columns()", () => {
    expect(() => sel().columns(["nope" as any])).toThrow(
      /Unknown column "nope"/,
    );
  });
});

describe("SelectBuilder.generateSql — where / order / limit / offset", () => {
  it("WHERE with object condition", () => {
    const q = sel().where({ verified: true }).generateSql();
    expect(q.sql).toBe('SELECT * FROM "app"."user" WHERE "verified" = $1');
    expect(q.params).toEqual([true]);
  });

  it("ORDER BY with direction and nulls", () => {
    const q = sel().orderBy("name", "DESC", "NULLS LAST").generateSql();
    expect(q.sql).toBe(
      'SELECT * FROM "app"."user" ORDER BY "name" DESC NULLS LAST',
    );
  });

  it("throws when ordering by unknown column", () => {
    expect(() => sel().orderBy("missing" as any)).toThrow(
      /Unknown column "missing"/,
    );
  });

  it("LIMIT and OFFSET", () => {
    const q = sel().limit(10).offset(5).generateSql();
    expect(q.sql).toBe('SELECT * FROM "app"."user" LIMIT 10 OFFSET 5');
  });

  it("rejects negative / non-integer limit and offset", () => {
    expect(() => sel().limit(-1)).toThrow(/non-negative integer/);
    expect(() => sel().limit(1.5)).toThrow(/non-negative integer/);
    expect(() => sel().offset(-2)).toThrow(/non-negative integer/);
  });

  it("composes columns + where + order + limit + offset in order", () => {
    const q = sel()
      .columns(["id", "name"])
      .where({ age: { gte: 18 } })
      .orderBy("name", "ASC")
      .limit(20)
      .offset(40)
      .generateSql();
    expect(q.sql).toBe(
      'SELECT "id", "name" FROM "app"."user" WHERE "age" >= $1 ORDER BY "name" ASC LIMIT 20 OFFSET 40',
    );
    expect(q.params).toEqual([18]);
  });

  it("supports whereRaw with renumbered params alongside object where", () => {
    const q = sel()
      .where({ verified: true })
      .whereRaw({ sql: '"age" BETWEEN $1 AND $2', params: [18, 30] })
      .generateSql();
    expect(q.sql).toBe(
      'SELECT * FROM "app"."user" WHERE "verified" = $1 AND "age" BETWEEN $2 AND $3',
    );
    expect(q.params).toEqual([true, 18, 30]);
  });
});

describe("SelectBuilder.generateSql — relations (lateral joins)", () => {
  it("hasMany relation builds a json_agg LEFT JOIN LATERAL with parent alias", () => {
    const q = new SelectBuilder(UserModel)
      .columns(["id", "name"])
      .with({ posts: { select: ["id", "title"], limit: 5 } })
      .generateSql();
    expect(q.sql).toBe(
      'SELECT "_p"."id", "_p"."name", "_rel_posts"."posts" ' +
        'FROM "app"."user" "_p" ' +
        "LEFT JOIN LATERAL (" +
        'SELECT COALESCE(json_agg("_t"), \'[]\'::json) AS "posts" ' +
        'FROM (SELECT "id", "title" FROM "app"."post" "_t" ' +
        'WHERE "_t"."author_id" = "_p"."id" LIMIT 5) "_t"' +
        ') "_rel_posts" ON TRUE',
    );
    expect(q.params).toEqual([]);
  });

  it("relation where conditions add params from the lateral subquery", () => {
    const q = new SelectBuilder(UserModel)
      .with({ posts: { where: { published: true } } })
      .generateSql();
    expect(q.sql).toContain('"_t"."published" = $1');
    expect(q.params).toEqual([true]);
  });

  it("with select [] (no columns) selects all parent columns plus rel column", () => {
    const q = new SelectBuilder(UserModel).with({ posts: true }).generateSql();
    expect(q.sql.startsWith('SELECT "_p".*, "_rel_posts"."posts" FROM')).toBe(
      true,
    );
  });

  it("belongsTo relation uses row_to_json and LIMIT 1", () => {
    const q = new SelectBuilder(PostModel)
      .columns(["id", "title"])
      .with({ author: { select: ["id", "email"] } })
      .generateSql();
    expect(q.sql).toContain('row_to_json("_t") AS "author"');
    // belongsTo join condition: inner.ref = parent.fk
    expect(q.sql).toContain('"_t"."id" = "_p"."author_id"');
    expect(q.sql).toContain("LIMIT 1");
  });

  it("throws for an unknown relation name", () => {
    expect(() =>
      new SelectBuilder(UserModel).with({ ghost: true } as any),
    ).toThrow(/Unknown relation "ghost"/);
  });
});

describe("SelectBuilder.generateJson", () => {
  it("produces a select descriptor mirroring the builder state", () => {
    const json = new SelectBuilder(UserModel)
      .columns(["id", "email"])
      .where({ verified: true })
      .orderBy("name", "ASC")
      .limit(10)
      .offset(2)
      .generateJson();
    expect(json).toMatchObject({
      type: "select",
      table: "user",
      schema: "app",
      columns: ["id", "email"],
      where: [{ verified: true }],
      orderBy: [{ column: "name", direction: "ASC" }],
      distinct: false,
      limit: 10,
      offset: 2,
    });
  });

  it("includes nested relation descriptors via with()", () => {
    const json = new SelectBuilder(UserModel)
      .with({ posts: { select: ["id"] } })
      .generateJson();
    expect(json.with).toBeDefined();
    expect(json.with![0]).toMatchObject({
      relation: "posts",
      table: "post",
      type: "hasMany",
      foreignKey: ["author_id"],
      references: ["id"],
      columns: ["id"],
    });
  });

  it("omits schema / limit / offset keys when unset", () => {
    const json = new SelectBuilder(NoSchemaModel).generateJson();
    expect("schema" in json).toBe(false);
    expect("limit" in json).toBe(false);
    expect("offset" in json).toBe(false);
  });
});
