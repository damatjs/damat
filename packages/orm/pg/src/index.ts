// ─── @damatjs/orm-pg ──────────────────────────────────────────────────────────
//
// pg execution layer for @damatjs/orm-model.
//
// Takes the `BuiltQuery` / descriptor output from any orm-model builder and
// runs it against a real PostgreSQL Pool, returning results typed as your
// generated row interface.
//
// Usage:
//
//   import { Pool } from "@damatjs/deps/pg";
//   import { PgModelClient } from "@damatjs/orm-pg";
//   import { UserSchema } from "./schema";
//   import type { User } from "./generated/types";
//
//   const pool = new Pool({ connectionString: process.env.DATABASE_URL });
//   const userClient = new PgModelClient<User>(UserSchema, pool);
//
//   const { rows } = await userClient.findMany({
//     select: ["id", "email"],
//     where: { verified: true },
//     with: { orders: { select: ["id", "total"] } },
//   });
//   // rows: User[]

// ─── Result types ─────────────────────────────────────────────────────────────
export type {
  PgSelectResult,
  PgInsertResult,
  PgUpdateResult,
  PgDeleteResult,
  PgQueryResult,
} from "./types";

// ─── Low-level executor functions ─────────────────────────────────────────────
export {
  pgExecuteRaw,
  pgSelect,
  pgInsert,
  pgUpdate,
  pgDelete,
  pgTransaction,
} from "./executor";

// ─── PgModelClient — ergonomic bound client ───────────────────────────────────
export { PgModelClient } from "./client";

// ─── Query Logger ─────────────────────────────────────────────────────────────
export {
  QueryLogger,
  getQueryLogger,
  setQueryLogger,
  configureQueryLogger,
  type QueryLoggerOptions,
} from "./logger";
