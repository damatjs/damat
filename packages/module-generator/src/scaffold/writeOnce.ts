import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { CrudScaffoldResult } from "./type";

export function writeOnce(result: CrudScaffoldResult) {
  return (path: string, content: string): void => {
    if (existsSync(path)) {
      result.skipped.push(path);
      return;
    }
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, content, "utf8");
    result.created.push(path);
  };
}
