import { describe, it, expect } from "bun:test";
import * as processor from "../index";
import { moduleSchema, idColumn, table } from "./__fixtures__/schemas";

/**
 * Verifies the public namespace-export surface that downstream packages
 * (@damatjs/orm-migration, @damatjs/orm-cli) actually consume, e.g.
 *   diffSchemas.diffSchemas(...)
 *   generateMigration.generateFromDiff(...)
 *   loadSnapshot(...) / saveSnapshot(...)
 */

describe("public API surface", () => {
  it("exposes the diff namespaces", () => {
    expect(typeof processor.diffSchemas.diffSchemas).toBe("function");
    expect(typeof processor.reverseDiff.reverseDiff).toBe("function");
    expect(typeof processor.priorityDiff.PRIORITY).toBe("object");
    expect(typeof processor.columnsDiff.diffColumns).toBe("function");
    expect(typeof processor.enumsDiff.diffEnums).toBe("function");
    expect(typeof processor.foreignKeysDiff.diffForeignKeys).toBe("function");
    expect(typeof processor.indexesDiff.diffIndexes).toBe("function");
    expect(typeof processor.tablesDiff.diffTable).toBe("function");
    expect(typeof processor.utilsDiff.createNameMap).toBe("function");
  });

  it("exposes the sqlGenerator namespaces", () => {
    expect(typeof processor.tablesSqlGenerator.generateCreateTable).toBe("function");
    expect(typeof processor.columnsSqlGenerator.generateAddColumn).toBe("function");
    expect(typeof processor.enumsSqlGenerator.generateCreateEnum).toBe("function");
    expect(typeof processor.indexesSqlGenerator.generateCreateIndex).toBe("function");
    expect(typeof processor.foreignKeysSqlGenerator.generateAddForeignKey).toBe("function");
    expect(typeof processor.changeSqlGenerator.generateChangeSQL).toBe("function");
    expect(typeof processor.generateMigration.generateFromDiff).toBe("function");
    expect(typeof processor.generateMigration.generateFromSnapshot).toBe("function");
  });

  it("exposes the snapshot helpers at the top level", () => {
    expect(typeof processor.loadSnapshot).toBe("function");
    expect(typeof processor.saveSnapshot).toBe("function");
    expect(typeof processor.snapshotExist).toBe("function");
  });

  it("end-to-end diff → generate works through the public namespaces", () => {
    const prev = moduleSchema();
    const next = moduleSchema({ tables: [table("user", [idColumn])] });
    const diff = processor.diffSchemas.diffSchemas(prev, next);
    expect(diff.hasChanges).toBe(true);
    const migration = processor.generateMigration.generateFromDiff(diff);
    expect(migration.upStatements[0]).toContain('CREATE TABLE IF NOT EXISTS "public"."user"');
  });
});
