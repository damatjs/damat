import { existsSync, readFileSync } from "node:fs";

export function readModuleMeta(path: string) {
  if (!existsSync(path))
    return { version: "", description: "(no module.json)" };
  try {
    const manifest = JSON.parse(readFileSync(path, "utf-8"));
    return {
      version: manifest.version ?? "",
      description: manifest.description ?? "",
    };
  } catch {
    return { version: "", description: "(invalid module.json)" };
  }
}
