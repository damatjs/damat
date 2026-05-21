import { quoteIdent, buildTableRef, buildOrderByClause } from "../../helpers";
import { ResolvedRelation, RelationIncludeOptions } from "../../relations";
import { compileRelCondition } from "./condition";

export function buildLateralJoin(
  relName: string,
  resolved: ResolvedRelation,
  opts: RelationIncludeOptions,
  parentAlias: string,
  params: unknown[],
): string {
  const targetRef = buildTableRef({
    name: resolved.target._tableName,
    ...(resolved.target._schemaName !== undefined ? { schema: resolved.target._schemaName } : {}),
  });
  const outerAlias = quoteIdent(`_rel_${relName}`);
  const innerAlias = `_t`;
  const innerCols = opts.select && opts.select.length > 0 ? opts.select.map(quoteIdent).join(", ") : "*";

  const joinCondParts: string[] = [];
  for (let i = 0; i < resolved.foreignKey.length; i++) {
    const fkCol = resolved.foreignKey[i]!;
    const refCol = resolved.references[i]!;
    if (resolved.type === "belongsTo") {
      joinCondParts.push(`${quoteIdent(innerAlias)}.${quoteIdent(refCol)} = ${quoteIdent(parentAlias)}.${quoteIdent(fkCol)}`);
    } else {
      joinCondParts.push(`${quoteIdent(innerAlias)}.${quoteIdent(fkCol)} = ${quoteIdent(parentAlias)}.${quoteIdent(refCol)}`);
    }
  }

  const userWhereParts: string[] = [];
  const targetCols = new Set(resolved.target.toTableSchema().columns.map((c) => c.name));
  if (opts.where) {
    for (const [col, val] of Object.entries(opts.where)) {
      if (targetCols.has(col)) {
        userWhereParts.push(compileRelCondition(`${quoteIdent(innerAlias)}.${quoteIdent(col)}`, val, params));
      }
    }
  }
  if (opts.whereRaw) {
    const raws = Array.isArray(opts.whereRaw) ? opts.whereRaw : [opts.whereRaw];
    for (const raw of raws) {
      const offset = params.length;
      userWhereParts.push(raw.sql.replace(/\$(\d+)/g, (_, n) => `$${parseInt(n, 10) + offset}`));
      if (raw.params) params.push(...raw.params);
    }
  }

  const allWhere = [...joinCondParts, ...userWhereParts];
  const whereClause = allWhere.length > 0 ? `WHERE ${allWhere.join(" AND ")}` : "";
  const orderByClause = opts.orderBy && opts.orderBy.length > 0
    ? buildOrderByClause(opts.orderBy.map((o) => {
        const item: import("../../types").OrderByClause = { column: o.column as string };
        if (o.direction !== undefined) item.direction = o.direction;
        if (o.nulls !== undefined) item.nulls = o.nulls;
        return item;
      }))
    : "";

  const limitClause = opts.limit !== undefined ? `LIMIT ${opts.limit}` : "";
  const offsetClause = opts.offset !== undefined ? `OFFSET ${opts.offset}` : "";

  const innerParts = [`SELECT ${innerCols}`, `FROM ${targetRef} ${quoteIdent(innerAlias)}`, whereClause, orderByClause, limitClause, offsetClause]
    .filter((p) => p.length > 0)
    .join(" ");

  let lateralBody: string;
  if (resolved.type === "hasMany") {
    lateralBody = `SELECT COALESCE(json_agg(${quoteIdent(innerAlias)}), '[]'::json) AS ${quoteIdent(relName)} FROM (${innerParts}) ${quoteIdent(innerAlias)}`;
  } else {
    lateralBody = `SELECT row_to_json(${quoteIdent(innerAlias)}) AS ${quoteIdent(relName)} FROM (${opts.limit !== undefined ? innerParts : `${innerParts} LIMIT 1`}) ${quoteIdent(innerAlias)}`;
  }

  return `LEFT JOIN LATERAL (${lateralBody}) ${outerAlias} ON TRUE`;
}
