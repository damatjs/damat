import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { model, columns, collectModels } from "@damatjs/orm-model";
import { PgEntityManager } from "@damatjs/orm-pg";
import { Pool } from "@damatjs/deps/pg";
import { ModelMethods } from "../../service/methods";

/**
 * Regression: cascade delete must work when a child's table name (e.g.
 * "member_accounts") differs from its collectModels accessor key (e.g.
 * "memberAccounts"). Relations reference *table names*, while the entity-manager
 * registry is keyed by the accessor key — the two diverge for any
 * snake_case/multi-word table. getRepository/resolveModel resolve table names
 * via the registry's tableNameIndex so cascade can traverse them.
 *
 * Needs a real Postgres (the in-memory cascade tests can't reproduce the
 * registry-keying gap). Gated on DATABASE_URL.
 */
describe.skipIf(!process.env.DATABASE_URL)("cascade — snake_case child tables", () => {
  const AssociationModel = model("associations", {
    id: columns.id({ prefix: "assoc" }).primaryKey(),
    name: columns.text(),
    memberAccounts: columns.hasMany("member_accounts").mappedBy("association"),
  });
  const MemberAccountModel = model("member_accounts", {
    id: columns.id({ prefix: "mbr" }).primaryKey(),
    association_id: columns
      .belongsTo("associations")
      .link({ foreignKey: "association_id" })
      .indexed(),
    name: columns.text().nullable(),
  });

  const models = collectModels([AssociationModel, MemberAccountModel]);
  let pool: Pool;
  let em: PgEntityManager;

  beforeAll(async () => {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    em = new PgEntityManager({ pool, models } as never);
    await pool.query(`DROP TABLE IF EXISTS member_accounts, associations CASCADE`);
    await pool.query(`CREATE TABLE associations (id text primary key, name text)`);
    await pool.query(
      `CREATE TABLE member_accounts (id text primary key, association_id text not null, name text)`,
    );
  });

  afterAll(async () => {
    await pool.query(`DROP TABLE IF EXISTS member_accounts, associations CASCADE`);
    await pool.end();
  });

  it("cascade-deletes the snake_case child with the parent", async () => {
    await pool.query(`INSERT INTO associations (id, name) VALUES ('a1', 'HOA')`);
    await pool.query(
      `INSERT INTO member_accounts (id, association_id, name) VALUES ('m1', 'a1', 'Bob')`,
    );

    const assoc = new ModelMethods(AssociationModel, "associations", em);
    const deleted = await assoc.delete({ where: { id: "a1" }, cascade: true });

    expect(deleted).toBe(2); // association + member
    const { rows: members } = await pool.query(
      `SELECT id FROM member_accounts WHERE association_id = 'a1'`,
    );
    expect(members.length).toBe(0);
  });
});
