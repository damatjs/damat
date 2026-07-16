import type { OrmModuleContainer } from "@/cli/types";
import { resolveLinkFields, type WarningContext } from "./linkFields";

const banner =
  "// This file is auto-generated. Do not edit it manually.\n" +
  "// Re-generate by running: bun run codegen\n";

export async function augmentWithLinks(
  ctx: WarningContext,
  modules: OrmModuleContainer,
  moduleName: string,
  moduleConfig: OrmModuleContainer[string],
  filesMap: Map<string, string>,
): Promise<void> {
  if (!Object.values(modules).some((module) => module.kind === "link")) return;
  try {
    const fields = await resolveLinkFields(
      ctx,
      modules,
      moduleName,
      moduleConfig,
    );
    if (fields.length === 0) return;
    const { renderLinkAugmentations } = await import("@damatjs/link");
    const indexExports: string[] = [];
    for (const augmentation of renderLinkAugmentations(fields, banner)) {
      filesMap.set(augmentation.fileName, augmentation.content);
      indexExports.push(`export * from "./${augmentation.indexExport}";`);
    }
    const index = filesMap.get("index.ts") ?? "";
    filesMap.set("index.ts", `${index}${indexExports.join("\n")}\n`);
  } catch (error) {
    ctx.logger.warn(
      `Link type augmentation skipped: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
