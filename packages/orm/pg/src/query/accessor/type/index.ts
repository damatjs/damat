import { BuiltQuery, QueryDescriptor } from "../../types";

export * from "./create";
export * from "./delete";
export * from "./find";
export * from "./update";
export * from "./upsert";

// ─── Each method can return SQL or JSON ───────────────────────────────────────

/** The output of every accessor method — both representations available. */
export interface QueryResult<D extends QueryDescriptor> {
  /** Parameterised SQL ready for a database driver. */
  sql: BuiltQuery;
  /** Structured JSON descriptor for inspection / transformation. */
  json: D;
}
