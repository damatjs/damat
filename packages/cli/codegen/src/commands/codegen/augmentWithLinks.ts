import type { CliLogger } from "@damatjs/cli";
import { renderLinkAugmentations } from "@damatjs/link";
import type { ModuleContainer } from "./constant";
import { resolveLinkFields } from "./resolveLinkFields";

interface AugmentArguments {
  modules: ModuleContainer;
  moduleName: string;
  logger: Pick<CliLogger, "warn">;
}

export async function augmentWithLinks(
  args: AugmentArguments,
  files: Map<string, string>,
): Promise<void> {
  if (!Object.values(args.modules).some(({ kind }) => kind === "link")) return;
  try {
    const fields = await resolveLinkFields(
      args.modules,
      args.moduleName,
      args.logger,
    );
    if (!fields.length) return;
    const banner =
      "// This file is auto-generated. Do not edit it manually.\n" +
      "// Re-generate by running: bun run codegen\n";
    const exports: string[] = [];
    for (const augmentation of renderLinkAugmentations(fields, banner)) {
      files.set(augmentation.fileName, augmentation.content);
      exports.push(`export * from "./${augmentation.indexExport}";`);
    }
    files.set(
      "index.ts",
      `${files.get("index.ts") ?? ""}${exports.join("\n")}\n`,
    );
  } catch (error) {
    args.logger.warn(
      `Link type augmentation skipped: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
