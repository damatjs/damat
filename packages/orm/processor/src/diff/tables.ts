import type { TableSchema } from "@damatjs/orm-model/types";
import type {
  CreateTableChange,
  DropTableChange,
  SchemaChange,
} from "../types/diff";
import { PRIORITY } from "./priority";
import { diffColumns } from "./columns";
import { diffIndexes } from "./indexes";
import { diffForeignKeys } from "./foreignKeys";

/**
 * Diff a single table between two snapshots.
 */
export function diffTable(
  oldTable: TableSchema | undefined,
  newTable: TableSchema | undefined,
): { changes: SchemaChange[]; warnings: string[] } {
  const changes: SchemaChange[] = [];
  const warnings: string[] = [];

  // Added
  if (!oldTable && newTable) {
    changes.push({
      type: "create_table",
      tableName: newTable.name,
      table: newTable,
      priority: PRIORITY.CREATE_TABLE,
    } as CreateTableChange);
    return { changes, warnings };
  }

  // Removed
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

  // Both exist — diff internals
  if (oldTable && newTable) {
    changes.push(
      ...diffColumns(newTable.name, oldTable.columns, newTable.columns),
    );
    changes.push(
      ...diffIndexes(newTable.name, oldTable.indexes, newTable.indexes),
    );
    changes.push(
      ...diffForeignKeys(
        newTable.name,
        oldTable.foreignKeys,
        newTable.foreignKeys,
      ),
    );
  }

  return { changes, warnings };
}
