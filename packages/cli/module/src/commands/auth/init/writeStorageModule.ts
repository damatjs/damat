import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  indexTemplate,
  manifestTemplate,
  modelsTemplate,
  readmeTemplate,
  serviceTemplate,
} from "../scaffold/templates";

export function writeStorageModule(targetDir: string) {
  const files: Record<string, string> = {
    "models/index.ts": modelsTemplate(),
    "service.ts": serviceTemplate(),
    "index.ts": indexTemplate(),
    "damat.json": manifestTemplate(),
    "README.md": readmeTemplate(),
  };
  mkdirSync(join(targetDir, "migrations"), { recursive: true });
  for (const [relative, content] of Object.entries(files)) {
    const fullPath = join(targetDir, relative);
    mkdirSync(join(fullPath, ".."), { recursive: true });
    writeFileSync(fullPath, content);
  }
}
