import { SelectDescriptor, RelationDescriptor, WhereConditionJson, OrderByJson } from "@damatjs/orm-type";
import { assertValidRelationMap, resolveModelRelations, ResolvedRelation, RelationIncludeOptions } from "../relations";

export function buildSelectJson(builder: any): SelectDescriptor {
  const desc: SelectDescriptor = {
    type: "select",
    table: builder._tableRef.name,
    columns: [...builder._cols],
    where: builder._whereClauses.map((c: any) => ({ ...c })) as WhereConditionJson[],
    whereRaw: builder._rawWhereClauses.map((c: any) => ({ ...c })),
    orderBy: builder._orderByClauses.map((c: any) => ({ ...c })) as OrderByJson[],
    distinct: builder._distinct,
  };
  if (builder._tableRef.schema !== undefined) desc.schema = builder._tableRef.schema;
  if (builder._limit !== undefined) desc.limit = builder._limit;
  if (builder._offset !== undefined) desc.offset = builder._offset;

  if (builder._withRelations.size > 0) {
    const resolvedRelations = resolveModelRelations(builder._model);
    const withDescs: RelationDescriptor[] = [];
    for (const [relName, relOpts] of builder._withRelations) {
      const resolved = resolvedRelations.get(relName);
      if (resolved) {
        withDescs.push(buildRelationDescriptor(relName, resolved, relOpts));
      }
    }
    desc.with = withDescs;
  }
  return desc;
}

export function buildRelationDescriptor(
  relName: string,
  resolved: ResolvedRelation,
  opts: RelationIncludeOptions,
): RelationDescriptor {
  const targetSchema = resolved.target._schemaName;
  const relDesc: RelationDescriptor = {
    relation: relName,
    table: resolved.target._tableName,
    type: resolved.type,
    foreignKey: resolved.foreignKey,
    references: resolved.references,
    columns: opts.select ? [...(opts.select as string[])] : [],
    where: opts.where ? [{ ...(opts.where as Record<string, unknown>) }] : [],
    whereRaw: opts.whereRaw
      ? Array.isArray(opts.whereRaw)
        ? opts.whereRaw.map((r) => ({ ...r }))
        : [{ ...opts.whereRaw }]
      : [],
    orderBy: opts.orderBy
      ? opts.orderBy.map((o) => ({ ...o, column: o.column as string }))
      : [],
    with: [],
  };
  if (targetSchema !== undefined) relDesc.schema = targetSchema;
  if (opts.limit !== undefined) relDesc.limit = opts.limit;
  if (opts.offset !== undefined) relDesc.offset = opts.offset;

  if (opts.with && Object.keys(opts.with).length > 0) {
    assertValidRelationMap(resolved.target, opts.with);
    const nestedResolved = resolveModelRelations(resolved.target);
    for (const [nestedName, nestedOpts] of Object.entries(opts.with)) {
      if (nestedOpts === false) continue;
      const nestedResolution = nestedResolved.get(nestedName);
      if (nestedResolution) {
        const nestedOptions: RelationIncludeOptions = nestedOpts === true ? {} : nestedOpts;
        relDesc.with.push(buildRelationDescriptor(nestedName, nestedResolution, nestedOptions));
      }
    }
  }
  return relDesc;
}
