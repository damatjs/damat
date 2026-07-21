import { existsSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import type { ResolvedModuleSource } from "../types";

export function resolveLocalSource(
  source: string,
  cwd: string,
): ResolvedModuleSource | null {
  const path = isAbsolute(source) ? source : resolve(cwd, source);
  if (!existsSync(path)) return null;
  return {
    dir: path,
    cleanup: () => {},
    origin: { type: "path", ref: source, url: path },
  };
}
