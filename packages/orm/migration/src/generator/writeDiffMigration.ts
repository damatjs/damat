import fs from "node:fs";
import path from "node:path";
import {
  generateMigration,
  saveSnapshot,
  type CreateDiffMigrationOptions,
  type DiffMigrationResult,
} from "@damatjs/orm-processor";
import { log } from "../logger";
import { getMigrationTemplateWithSQL } from "../utils/template";
import { generateTimestamp } from "../utils/timestamp";

type SchemaDiff = Parameters<typeof generateMigration.generateFromDiff>[0];
type SchemaSnapshot = Parameters<typeof saveSnapshot>[1];

interface WriteDiffMigrationInput {
  moduleName: string;
  migrationsDir: string;
  diff: SchemaDiff;
  currentSnapshot: SchemaSnapshot;
  options: CreateDiffMigrationOptions;
}

export function writeDiffMigration(
  input: WriteDiffMigrationInput,
): DiffMigrationResult {
  const { moduleName, migrationsDir, diff, currentSnapshot, options } = input;
  const migration = generateMigration.generateFromDiff(diff, options);
  const now = new Date();
  const label = moduleName.charAt(0).toUpperCase() + moduleName.slice(1);
  const className = `Migration${generateTimestamp(now)}_${label}`;
  const filename = `${className}.sql`;
  const filePath = path.join(migrationsDir, filename);
  const template = getMigrationTemplateWithSQL(
    className,
    label,
    moduleName,
    now,
    migration,
  );

  fs.writeFileSync(filePath, template);
  log("success", `Created migration: ${moduleName}/${filename}`);
  if (options.updateSnapshot !== false) {
    saveSnapshot(migrationsDir, currentSnapshot);
    log("info", `Updated schema snapshot for ${moduleName}`);
  }
  for (const warning of migration.warnings) log("warn", warning);
  return {
    filePath,
    hasChanges: diff.hasChanges,
    diff,
    migration,
    warnings: migration.warnings,
  };
}
