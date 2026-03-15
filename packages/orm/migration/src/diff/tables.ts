/**
 * Table Diff
 *
 * Compare two tables and detect changes.
 */

import type {
  CreateTableChange,
  DropTableChange,
  SchemaChange,
  TableSchema,
} from "../types";
import { PRIORITY } from "./priority";
import { diffColumns } from "./columns";
import { diffIndexes } from "./indexes";
import { diffForeignKeys } from "./foreignKeys";

/**
 * Diff a single table
 */
export function diffTable(
  oldTable: TableSchema | undefined,
  newTable: TableSchema | undefined,
): { changes: SchemaChange[]; warnings: string[] } {
  const changes: SchemaChange[] = [];
  const warnings: string[] = [];

  // Table was added
  if (!oldTable && newTable) {
    changes.push({
      type: "create_table",
      tableName: newTable.name,
      table: newTable,
      priority: PRIORITY.CREATE_TABLE,
    } as CreateTableChange);
    return { changes, warnings };
  }

  // Table was removed
  if (oldTable && !newTable) {
    changes.push({
      type: "drop_table",
      tableName: oldTable.name,
      cascade: true,
      priority: PRIORITY.DROP_TABLE,
    } as DropTableChange);
    warnings.push(
      `Dropping table '${oldTable.name}' will delete all data in it`,
    );
    return { changes, warnings };
  }

  // Both exist - diff contents
  if (oldTable && newTable) {
    // Diff columns
    const columnChanges = diffColumns(
      newTable.name,
      oldTable.columns,
      newTable.columns,
    );
    changes.push(...columnChanges);

    // Diff indexes
    const indexChanges = diffIndexes(
      newTable.name,
      oldTable.indexes,
      newTable.indexes,
    );
    changes.push(...indexChanges);

    // Diff foreign keys
    const fkChanges = diffForeignKeys(
      newTable.name,
      oldTable.foreignKeys,
      newTable.foreignKeys,
    );
    changes.push(...fkChanges);
  }

  return { changes, warnings };
}
