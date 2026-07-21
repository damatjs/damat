import type { ResolvedModuleSource } from "../types";
import { resolveGitSource } from "./git";
import { resolveLocalSource } from "./local";
import { resolveRegistrySource } from "./registry";

export async function resolveModuleSource(
  source: string,
  cwd: string,
): Promise<ResolvedModuleSource> {
  const local = resolveLocalSource(source, cwd);
  if (local) return local;
  const registry = await resolveRegistrySource(source, (inner) =>
    resolveModuleSource(inner, cwd),
  );
  return registry ?? resolveGitSource(source);
}

export * from "./git";
export * from "./local";
export * from "./registry";
