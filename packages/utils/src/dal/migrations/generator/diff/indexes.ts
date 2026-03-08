/**
 * Index Diff
 *
 * Compare indexes between two tables and detect changes.
 */

import type {
  AddIndexChange,
  DropIndexChange,
  IndexSchema,
  SchemaChange,
} from "../types";
import { PRIORITY } from "./priority";
import { createNameMap, indexesEqual } from "./utils";

/**
 * Diff indexes between two tables
 */
export function diffIndexes(
  tableName: string,
  oldIndexes: IndexSchema[],
  newIndexes: IndexSchema[],
): SchemaChange[] {
  const changes: SchemaChange[] = [];

  const oldMap = createNameMap(oldIndexes);
  const newMap = createNameMap(newIndexes);

  // Find added indexes
  for (const [name, newIdx] of newMap) {
    const oldIdx = oldMap.get(name);
    if (!oldIdx) {
      changes.push({
        type: "add_index",
        tableName,
        index: newIdx,
        priority: PRIORITY.ADD_INDEX,
      } as AddIndexChange);
    } else if (!indexesEqual(oldIdx, newIdx)) {
      // Index changed - drop and recreate
      changes.push({
        type: "drop_index",
        tableName,
        indexName: name,
        priority: PRIORITY.DROP_INDEX,
      } as DropIndexChange);
      changes.push({
        type: "add_index",
        tableName,
        index: newIdx,
        priority: PRIORITY.ADD_INDEX,
      } as AddIndexChange);
    }
  }

  // Find removed indexes
  for (const [name] of oldMap) {
    if (!newMap.has(name)) {
      changes.push({
        type: "drop_index",
        tableName,
        indexName: name,
        priority: PRIORITY.DROP_INDEX,
      } as DropIndexChange);
    }
  }

  return changes;
}
