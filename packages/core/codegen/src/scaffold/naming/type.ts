/**
 * Naming derived for one table's CRUD scaffold. These mirror the names that
 * `@damatjs/codegen` emits in `types/` so generated steps/workflows/routes
 * can import the generated row types and zod schemas by their exact names.
 */
export interface CrudNames {
  /** Owning module id (the `getModule(...)` key). */
  moduleId: string;
  /** Table name as defined in `model("...")`, e.g. `items`, `ai_sessions`. */
  table: string;
  /**
   * Service accessor property = the model registration key = the table name
   * camelCased (no pluralizing), e.g. `items`, `aiSessions`. Steps call
   * `service.<prop>`, so `service.ts` must register the model under this key.
   */
  prop: string;
  /**
   * Route + workflow resource folder = the same camelCased table name as
   * `prop`, so the URL/folder and the service accessor stay identical.
   */
  fileBase: string;
  /** PascalCase of the table (mirrors codegen's `toPascalCase`). */
  pascal: string;
  /** Primary key column name (defaults to `id`). */
  pk: string;
  // Generated type names (from `types/<fileBase>.ts`)
  rowType: string;
  newType: string;
  updateType: string;
  // Generated zod / id names (from `types/<fileBase>.zod.ts`)
  idType: string;
  queryType: string;
  /** Params type for the `[id]` route, e.g. `ItemParams` (`{ id: ... }`). */
  paramsType: string;
  newSchema: string;
  updateSchema: string;
  querySchema: string;
  idSchema: string;
  /** Params zod schema for the `[id]` route, e.g. `ItemParamsSchema`. */
  paramsSchema: string;
}