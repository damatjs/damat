import type { CliLogger } from "@damatjs/cli";

interface GenerationResult {
  outputDir: string;
  files: string[];
  scaffolded: string[];
}

export function reportGeneration(
  logger: CliLogger,
  result: GenerationResult,
): void {
  logger.info(`Output: ${result.outputDir}`);
  logger.info(`Files: ${result.files.join(", ")}`);
  if (result.scaffolded.length)
    logger.success(
      `Scaffolded ${result.scaffolded.length} CRUD files (steps, workflows, routes)`,
    );
}
