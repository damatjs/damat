import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  registryAugmentation,
  registryModuleAugmentation,
  resolveServiceClassName,
} from "../registry";
import { toPascalCase } from "../scaffold/naming";

interface WriteOutputOptions {
  filesMap: Map<string, string>;
  typesDir: string;
  moduleId: string;
  serviceDir: string;
  serviceImport: string;
  moduleTypeImport?: string;
}

export function writeGeneratedOutput(options: WriteOutputOptions): string[] {
  if (!existsSync(options.typesDir))
    mkdirSync(options.typesDir, { recursive: true });
  const files: string[] = [];
  for (const [fileName, content] of options.filesMap) {
    writeFileSync(join(options.typesDir, fileName), content, "utf8");
    files.push(fileName);
  }
  const registry = options.moduleTypeImport
    ? registryModuleAugmentation(
        options.moduleId,
        `${toPascalCase(options.moduleId)}Module`,
        options.moduleTypeImport,
      )
    : registryAugmentation(
        options.moduleId,
        resolveServiceClassName(options.serviceDir, options.moduleId),
        options.serviceImport,
      );
  writeFileSync(join(options.typesDir, "registry.ts"), registry, "utf8");
  files.push("registry.ts");
  return files;
}
