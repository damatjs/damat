import { Pool } from "@damatjs/deps/pg";

interface RoleRow {
  userName: string;
  superuser: boolean;
  createDatabase: boolean;
  createRole: boolean;
  createSchema: boolean;
  ownedTables: number;
  writableTables: number;
  tables: number;
}

async function inspect(url: string): Promise<RoleRow> {
  const pool = new Pool({ connectionString: url });
  try {
    const result = await pool.query<RoleRow>(`
      SELECT current_user AS "userName", r.rolsuper AS superuser,
        r.rolcreatedb AS "createDatabase", r.rolcreaterole AS "createRole",
        has_schema_privilege(current_user, 'public', 'CREATE') AS "createSchema",
        (SELECT COUNT(*)::int FROM pg_tables WHERE schemaname='public'
          AND tableowner=current_user) AS "ownedTables",
        (SELECT COUNT(*)::int FROM pg_tables WHERE schemaname='public'
          AND has_table_privilege(current_user, schemaname||'.'||tablename,
            'SELECT,INSERT,UPDATE,DELETE')) AS "writableTables",
        (SELECT COUNT(*)::int FROM pg_tables WHERE schemaname='public') AS tables
      FROM pg_roles r WHERE r.rolname=current_user`);
    return result.rows[0]!;
  } finally {
    await pool.end();
  }
}

const runtimeUrl = process.env.DATABASE_URL;
const migrationUrl = process.env.MIGRATION_DATABASE_URL;
if (!runtimeUrl || !migrationUrl)
  throw new Error("database acceptance URLs are required");
const runtime = await inspect(runtimeUrl);
const migration = await inspect(migrationUrl);
const unsafe = [runtime, migration].some(
  (role) => role.superuser || role.createDatabase || role.createRole,
);
if (unsafe)
  throw new Error("database application roles hold administrative privileges");
if (runtime.createSchema || runtime.ownedTables > 0)
  throw new Error("runtime database role can mutate the schema or owns tables");
if (!migration.createSchema)
  throw new Error("migration role cannot create schema objects");
if (runtime.tables === 0 || runtime.writableTables !== runtime.tables)
  throw new Error("runtime role lacks CRUD grants on migrated tables");
console.log(JSON.stringify({ runtime, migration }, null, 2));
