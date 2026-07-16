import type { ModuleSchema } from "@damatjs/orm-type";
import type { ILogger } from "@damatjs/logger";
import { getLogger } from "@damatjs/logger";
import { generateTableScaffold } from "./generateTableScaffold";
import type { CrudScaffoldOptions, CrudScaffoldResult } from "./type";

/**
 * Generate the per-operation CRUD scaffold (steps + workflows + split routes)
 * for every table in `schema`. Files are written ONCE — existing files are
 * left untouched so hand edits survive regeneration. Mirrors how the layering
 * is meant to flow: route → workflow → step → service (CRUD only).
 */
export function generateCrudScaffold(
  schema: ModuleSchema,
  options: CrudScaffoldOptions,
  loggerData?: ILogger,
): CrudScaffoldResult {
  const logger = loggerData ?? getLogger();
  const result: CrudScaffoldResult = { created: [], skipped: [] };
  for (const table of schema.tables) {
    generateTableScaffold(table, options, result);
  }

  logger.info("generateCrudScaffold completed", {
    moduleId: options.moduleId,
    created: result.created.length,
    skipped: result.skipped.length,
  });

  return result;
}
