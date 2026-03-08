/**
 * Migration Execution Operations
 *
 * Unified function for running or reverting migrations.
 */

import type { MikroORM } from "@damatjs/deps/mikro-orm/core";
import { Migration } from "@damatjs/deps/mikro-orm/migrations";
import { log } from "../logger";
import { MigrationTracker } from "../tracker";
import type { MigrationInfo, MigrationDirection } from "../../types";


/**
 * Execute a single migration in the specified direction.
 */
export async function executeMigration(
    orm: MikroORM,
    migration: MigrationInfo,
    moduleName: string,
    tracker: MigrationTracker,
    direction: MigrationDirection,
): Promise<{ success: boolean; error?: Error }> {
    const startTime = Date.now();
    const isUp = direction === "up";

    try {
        // Dynamic import the migration
        const migrationModule = await import(migration.path);
        const MigrationClass =
            migrationModule[migration.name] ||
            (Object.values(migrationModule)[0] as typeof Migration);

        // Create instance and run in specified direction
        const instance = new MigrationClass(orm.em.getDriver(), orm.config);
        await instance[direction]();

        // Execute the SQL
        const connection = orm.em.getConnection();
        for (const sql of (instance as any).queries || []) {
            await connection.execute(sql);
        }

        // Track the migration
        if (isUp) {
            const executionTime = Date.now() - startTime;
            await tracker.recordApplied(moduleName, migration.name, executionTime);
            log("success", `  Applied: ${migration.name}`, `(${executionTime}ms)`);
        } else {
            await tracker.recordReverted(moduleName, migration.name);
            log("success", `  Reverted: ${migration.name}`);
        }

        return { success: true };
    } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        const action = isUp ? "apply" : "revert";
        log("error", `  Failed to ${action}: ${migration.name}`, err.message);
        return { success: false, error: err };
    }
}
