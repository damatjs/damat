import { existsSync, realpathSync } from "node:fs";
import { isAbsolute, relative, resolve } from "node:path";

export function inside(root: string, target: string): boolean {
  const offset = relative(root, target);
  return offset === "" || (!offset.startsWith("..") && !isAbsolute(offset));
}

export function declaredPath(
  root: string,
  manifestDir: string,
  capability: string,
  value?: string,
): string | undefined {
  if (value === undefined) return undefined;
  const target = resolve(manifestDir, value);
  if (isAbsolute(value) || value.includes("\\") || !inside(root, target))
    throw new Error(`${capability} must stay inside the module artifact`);
  return assertArtifactPath(root, target, capability);
}

export function assertArtifactPath(
  root: string,
  target: string,
  capability: string,
): string {
  if (!existsSync(target))
    throw new Error(`${capability} path does not exist: ${target}`);
  if (!inside(realpathSync(root), realpathSync(target)))
    throw new Error(`${capability} must stay inside the module artifact`);
  return target;
}

export function firstExisting(paths: string[]): string | undefined {
  return paths.find((path) => existsSync(path));
}
