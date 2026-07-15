import { readFileSync } from "node:fs";
import { join } from "node:path";
import { locateModuleDir, readModuleManifest } from "@damatjs/module";

export interface PublishMetadata {
  name: string;
  version: string;
  manifest: Record<string, unknown>;
}

export function readPackageMetadata(
  cwd: string,
): Omit<PublishMetadata, "manifest"> {
  const parsed = JSON.parse(
    readFileSync(join(cwd, "package.json"), "utf-8"),
  ) as Record<string, unknown>;
  if (typeof parsed.name !== "string" || !parsed.name)
    throw new Error("package.json is missing a valid `name` field");
  if (typeof parsed.version !== "string" || !parsed.version)
    throw new Error("package.json is missing a valid `version` field");
  return { name: parsed.name, version: parsed.version };
}

export function readPublishManifest(cwd: string): Record<string, unknown> {
  return readModuleManifest(locateModuleDir(cwd)) as unknown as Record<
    string,
    unknown
  >;
}
