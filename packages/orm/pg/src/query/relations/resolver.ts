import { BelongsToBuilder, HasManyBuilder, HasOneBuilder, ModelDefinition } from '@damatjs/orm-model';
import type { RelationIncludeMap, ResolvedRelation } from "./types";
import { RelationGuardError } from "./error";

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

export function resolveModelRelations(
  model: ModelDefinition,
): Map<string, ResolvedRelation> {
  const relations = new Map<string, ResolvedRelation>();

  for (const [propName, propValue] of Object.entries(model._properties)) {
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

    if (
      propValue instanceof HasManyBuilder ||
      propValue instanceof HasOneBuilder
    ) {
      const target = propValue.getModuleTarget();
      const mappedByProp = propValue.getMappedBy();

      let fkCols: string[] = [];
      let refCols: string[] = ["id"];

      if (mappedByProp !== undefined) {
        const targetProp = target._properties[mappedByProp];
        if (targetProp instanceof BelongsToBuilder) {
          fkCols = targetProp.getForeignKey().map((fk) => fk.name);
          refCols = targetProp.getReference();
        }
      }

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
