import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { PackageManagerName } from "./types";

const LOCKS: Array<[PackageManagerName, string[]]> = [
  ["bun", ["bun.lock", "bun.lockb"]],
  ["npm", ["package-lock.json"]],
  ["pnpm", ["pnpm-lock.yaml"]],
  ["yarn", ["yarn.lock"]],
];

function parseName(value: unknown): PackageManagerName | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string")
    throw new Error("packageManager must be a string");
  const name = value.split("@")[0];
  if (name === "bun" || name === "npm" || name === "pnpm" || name === "yarn")
    return name;
  throw new Error(`unsupported packageManager: ${value}`);
}

function declared(projectDir: string): PackageManagerName | undefined {
  const path = join(projectDir, "package.json");
  if (!existsSync(path)) return undefined;
  const value = JSON.parse(readFileSync(path, "utf8")) as {
    packageManager?: unknown;
  };
  return parseName(value.packageManager);
}

export function detectPackageManager(
  projectDir: string,
  explicit?: PackageManagerName,
): PackageManagerName {
  if (explicit) return explicit;
  const signals = LOCKS.filter(([, files]) =>
    files.some((file) => existsSync(join(projectDir, file))),
  ).map(([name]) => name);
  if (signals.length > 1)
    throw new Error(
      `ambiguous package-manager lockfiles: ${signals.join(", ")}`,
    );
  const field = declared(projectDir);
  if (field && signals[0] && field !== signals[0])
    throw new Error(
      `packageManager ${field} conflicts with ${signals[0]} lockfile`,
    );
  const selected = field ?? signals[0];
  if (!selected)
    throw new Error(
      "unable to detect package manager; provide an explicit selection",
    );
  return selected;
}
