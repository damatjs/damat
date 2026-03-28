import { ModelDefinition } from "@/schema/model";
import { BelongsToBuilder } from "@/properties/relation/belongsToBuilder";
import { HasManyBuilder } from "@/properties/relation/hasManyBuilder";
import { HasOneBuilder } from "@/properties/relation/hasOneBuilder";
import { OrderDirection, WhereClause, RawWhereClause } from "./types";

// ─── Relation Query Types ─────────────────────────────────────────────────────
//
// Drizzle-inspired relation loading that works by extending the SQL query
// with lateral joins rather than mixing and matching queries at runtime.
// The user can nest relations as deep as they need.
//
// Example:
// ```ts
// user.findMany({
//   select: ["id", "email"],
//   with: {
//     orders: {
//       select: ["id", "total"],
//       where: { status: "pending" },
//       with: {
//         items: {
//           select: ["id", "quantity"],
//           with: {
//             product: {
//               select: ["id", "name", "price"]
//             }
//           }
//         }
//       }
//     }
//   }
// });
// ```

// ─── Relation Include Options ─────────────────────────────────────────────────

/**
 * Options for including a relation in a query.
 * Mirrors FindOptions but for nested relations.
 */
export interface RelationIncludeOptions<Cols extends string = string> {
  /** Columns to select from the related table. Omit for all columns. */
  select?: Cols[];

  /** Object-style WHERE conditions for the related rows. */
  where?: WhereClause<Cols>;

  /** Raw SQL WHERE fragments for the related rows. */
  whereRaw?: RawWhereClause | RawWhereClause[];

  /** ORDER BY clauses for the related rows. */
  orderBy?: Array<{
    column: Cols;
    direction?: OrderDirection;
    nulls?: "NULLS FIRST" | "NULLS LAST";
  }>;

  /** Max related rows to return (for hasMany). */
  limit?: number;

  /** Rows to skip (for hasMany). */
  offset?: number;

  /** Nested relations to include. */
  with?: RelationIncludeMap;
}

/**
 * A map of relation name → include options.
 * Each key MUST match a relation property (hasMany / hasOne / belongsTo)
 * declared on the model — the guard enforces this at call time.
 */
export interface RelationIncludeMap {
  [relationName: string]: RelationIncludeOptions | boolean;
}

// ─── Relation Descriptor (JSON representation) ────────────────────────────────

/**
 * JSON descriptor for a relation include in a query.
 * Used in SelectDescriptor to represent nested relation loading.
 */
export interface RelationIncludeDescriptor {
  /** The relation property name on the parent model. */
  relation: string;

  /** The target table name. */
  table: string;

  /** The target table schema (if any). */
  schema?: string;

  /** Relation type: belongsTo, hasMany, or hasOne. */
  type: "belongsTo" | "hasMany" | "hasOne";

  /** The FK column(s) that link parent to child. */
  foreignKey: string[];

  /** The referenced column(s) on the target table. */
  references: string[];

  /** Columns to select from the related table. */
  columns: string[];

  /** WHERE conditions for the related rows. */
  where: Array<{ [column: string]: unknown }>;

  /** Raw WHERE fragments. */
  whereRaw: RawWhereClause[];

  /** ORDER BY clauses. */
  orderBy: Array<{
    column: string;
    direction?: OrderDirection;
    nulls?: "NULLS FIRST" | "NULLS LAST";
  }>;

  /** LIMIT for the relation (hasMany only). */
  limit?: number;

  /** OFFSET for the relation (hasMany only). */
  offset?: number;

  /** Nested relation includes. */
  with: RelationIncludeDescriptor[];
}

// ─── Relation Resolver ────────────────────────────────────────────────────────

/**
 * Resolves relation metadata from a ModelDefinition.
 * Used internally to build lateral join SQL for nested relations.
 */
export interface ResolvedRelation {
  /** The relation property name. */
  name: string;

  /** The relation type. */
  type: "belongsTo" | "hasMany" | "hasOne";

  /** The target ModelDefinition. */
  target: ModelDefinition;

  /**
   * FK column name(s).
   *
   * - For `belongsTo`: the FK lives on the **current** table (e.g. `user_id`).
   * - For `hasMany` / `hasOne`: the FK lives on the **target** table.
   */
  foreignKey: string[];

  /**
   * Referenced column name(s).
   *
   * - For `belongsTo`: the PK on the **target** table (e.g. `id`).
   * - For `hasMany` / `hasOne`: the PK on the **current** table (e.g. `id`).
   */
  references: string[];
}

// ─── Guard: RelationGuardError ────────────────────────────────────────────────

/**
 * Thrown when a `.with()` call references a relation name that does not
 * exist on the model — either it is entirely unknown or it references
 * a plain column rather than a relation property.
 *
 * ```
 * RelationGuardError: [query:with] Unknown relation "bogus" on model "user".
 *   Available relations: orders, profile
 * ```
 */
export class RelationGuardError extends Error {
  /** The model table name that was queried. */
  readonly modelName: string;
  /** The relation name that was not found. */
  readonly unknownRelation: string;
  /** All valid relation names on the model. */
  readonly availableRelations: string[];

  constructor(
    modelName: string,
    unknownRelation: string,
    availableRelations: string[],
  ) {
    const list =
      availableRelations.length > 0
        ? availableRelations.join(", ")
        : "(none defined)";
    super(
      `[query:with] Unknown relation "${unknownRelation}" on model "${modelName}".\n` +
        `  Available relations: ${list}`,
    );
    this.name = "RelationGuardError";
    this.modelName = modelName;
    this.unknownRelation = unknownRelation;
    this.availableRelations = availableRelations;
  }
}

// ─── Relation extraction helpers ──────────────────────────────────────────────

/**
 * Return the set of property names that are relation builders
 * (BelongsTo, HasMany, HasOne) on the given model.
 *
 * This is the source-of-truth used by the guard.
 */
export function getModelRelationNames(model: ModelDefinition): Set<string> {
  const names = new Set<string>();
  for (const [propName, propValue] of Object.entries(model._properties)) {
    if (
      propValue instanceof BelongsToBuilder ||
      propValue instanceof HasManyBuilder ||
      propValue instanceof HasOneBuilder
    ) {
      names.add(propName);
    }
  }
  return names;
}

/**
 * Assert that every key in `map` is a known relation on `model`.
 * Throws `RelationGuardError` for the first unknown key found.
 *
 * This guard runs inside `SelectBuilder.with()` so invalid relation names
 * are caught as early as possible — before any SQL is generated.
 */
export function assertValidRelationMap(
  model: ModelDefinition,
  map: RelationIncludeMap,
): void {
  const knownRelations = getModelRelationNames(model);
  for (const name of Object.keys(map)) {
    if (!knownRelations.has(name)) {
      throw new RelationGuardError(model._tableName, name, [...knownRelations]);
    }
  }
}

// ─── Full relation resolver ───────────────────────────────────────────────────

/**
 * Extract full relation metadata from a ModelDefinition.
 *
 * For each relation property the resolver determines:
 *  - the target model
 *  - the FK column(s) and referenced column(s) — correctly placed based on type
 *
 * @param model The model to extract relations from.
 * @returns Map of relation property name → ResolvedRelation.
 */
export function resolveModelRelations(
  model: ModelDefinition,
): Map<string, ResolvedRelation> {
  const relations = new Map<string, ResolvedRelation>();

  for (const [propName, propValue] of Object.entries(model._properties)) {
    // ── belongsTo: FK lives on THIS table ──────────────────────────────────
    if (propValue instanceof BelongsToBuilder) {
      const target = propValue.getModuleTarget();
      const fkCols = propValue.getForeignKey().map((fk) => fk.name);
      const refCols = propValue.getReference();

      relations.set(propName, {
        name: propName,
        type: "belongsTo",
        target,
        foreignKey: fkCols,
        references: refCols,
      });
      continue;
    }

    // ── hasMany / hasOne: FK lives on the TARGET table ─────────────────────
    if (
      propValue instanceof HasManyBuilder ||
      propValue instanceof HasOneBuilder
    ) {
      const target = propValue.getModuleTarget();
      const mappedByProp = propValue.getMappedBy();

      // Try to resolve the FK from the target's BelongsTo that points back here
      let fkCols: string[] = [];
      let refCols: string[] = ["id"]; // default PK on current table

      if (mappedByProp !== undefined) {
        const targetProp = target._properties[mappedByProp];
        if (targetProp instanceof BelongsToBuilder) {
          fkCols = targetProp.getForeignKey().map((fk) => fk.name);
          refCols = targetProp.getReference();
        }
      }

      // Fallback: auto-derive FK as <currentTable>_id on target
      if (fkCols.length === 0) {
        fkCols = [`${model._tableName}_id`];
      }

      relations.set(propName, {
        name: propName,
        type: propValue instanceof HasManyBuilder ? "hasMany" : "hasOne",
        target,
        foreignKey: fkCols,
        references: refCols,
      });
      continue;
    }
  }

  return relations;
}

// ─── SQL Generation Helpers for Relations ─────────────────────────────────────

/**
 * Build a lateral join subquery for a relation.
 * This is the Drizzle-style approach: extend the SQL rather than mixing queries.
 *
 * For belongsTo (parent lookup):
 * ```sql
 * LATERAL (
 *   SELECT row_to_json(t.*) AS "user"
 *   FROM "store"."user" t
 *   WHERE t."id" = parent."user_id"
 *   LIMIT 1
 * ) AS "_rel_user"
 * ```
 *
 * For hasMany (child collection):
 * ```sql
 * LATERAL (
 *   SELECT COALESCE(json_agg(t.*), '[]'::json) AS "orders"
 *   FROM (
 *     SELECT * FROM "store"."order"
 *     WHERE "user_id" = parent."id"
 *     ORDER BY "created_at" DESC
 *     LIMIT 10
 *   ) t
 * ) AS "_rel_orders"
 * ```
 */
export interface LateralJoinConfig {
  /** The relation being joined. */
  relation: ResolvedRelation;

  /** Alias for the parent table. */
  parentAlias: string;

  /** Include options provided by the user. */
  options: RelationIncludeOptions;

  /** Current parameter index (for $N placeholders). */
  paramOffset: number;
}

/**
 * Result of building a lateral join.
 */
export interface LateralJoinResult {
  /** The SQL fragment for the lateral join. */
  sql: string;

  /** Parameters used in the lateral join. */
  params: unknown[];

  /** The alias used for the join result. */
  alias: string;

  /** Nested lateral joins (for nested relations). */
  nested: LateralJoinResult[];
}
