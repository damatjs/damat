import type { ILogger } from "@damatjs/logger";
import { generateBarrels } from "../barrel";
import { generateCrudScaffold } from "../scaffold";
import type { RunModuleCodegenOptions } from "./runModuleCodegen";

export function scaffoldOutput(
  options: RunModuleCodegenOptions,
  logger: ILogger,
): string[] {
  let created: string[] = [];
  try {
    created = generateCrudScaffold(
      options.schema,
      {
        moduleId: options.moduleId,
        routesRoot: options.routesRoot,
        workflowsRoot: options.workflowsRoot,
        typesDir: options.typesDir,
        ...(options.aliases ? { aliases: options.aliases } : {}),
      },
      logger,
    ).created;
  } catch (error) {
    logger.warn(
      `CRUD scaffold skipped: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  try {
    generateBarrels(options.workflowsRoot, logger);
  } catch (error) {
    logger.warn(
      `Barrel generation skipped: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  return created;
}
