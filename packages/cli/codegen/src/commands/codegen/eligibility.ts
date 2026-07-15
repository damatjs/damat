import { existsSync } from "node:fs";
import type { CliLogger } from "@damatjs/cli";
import type { ModuleEntry } from "./constant";
import { modelsPath } from "./constant";
import type { ModuleCodegenOutcome } from "./runModule";

export function codegenEligibility(
  moduleName: string,
  moduleConfig: ModuleEntry,
  strict: boolean,
  logger: CliLogger,
): ModuleCodegenOutcome | null {
  if (moduleConfig.kind === "link") {
    logger.info(
      `'${moduleName}' is a link module; run codegen for the linked modules instead.`,
    );
    return "skipped";
  }
  if (existsSync(modelsPath(moduleConfig.resolve))) return null;
  const message = `Models directory not found for '${moduleName}': ${modelsPath(moduleConfig.resolve)}`;
  if (strict) {
    logger.error(message);
    return "error";
  }
  logger.warn(`${message} — skipping.`);
  return "skipped";
}
