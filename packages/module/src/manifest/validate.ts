import type { ModuleAuthor, ModuleEnvVar, ModuleManifest } from "./types";

const MODULE_NAME_PATTERN = /^[a-z][a-z0-9-]*$/;

/**
 * Validate a parsed module.json. Returns the manifest typed, or throws
 * with a message suitable for CLI output.
 */
export function validateModuleManifest(raw: unknown): ModuleManifest {
  if (raw === null || typeof raw !== "object") {
    throw new Error("module.json must contain a JSON object");
  }
  const manifest = raw as Record<string, unknown>;

  if (typeof manifest.name !== "string" || manifest.name.length === 0) {
    throw new Error('module.json requires a "name" field');
  }
  if (!MODULE_NAME_PATTERN.test(manifest.name)) {
    throw new Error(
      `module name "${manifest.name}" must be kebab-case (lowercase letters, digits, dashes)`,
    );
  }
  if (manifest.author !== undefined) {
    const author = manifest.author;
    const isString = typeof author === "string";
    const isObjectWithName =
      author !== null &&
      typeof author === "object" &&
      typeof (author as ModuleAuthor).name === "string";
    if (!isString && !isObjectWithName) {
      throw new Error(
        'module.json "author" must be a string or an object with a "name"',
      );
    }
  }
  if (manifest.env !== undefined) {
    if (!Array.isArray(manifest.env)) {
      throw new Error('module.json "env" must be an array');
    }
    for (const entry of manifest.env) {
      if (
        entry === null ||
        typeof entry !== "object" ||
        typeof (entry as ModuleEnvVar).name !== "string"
      ) {
        throw new Error(
          'each module.json "env" entry must be an object with a "name"',
        );
      }
    }
  }
  if (
    manifest.packages !== undefined &&
    (manifest.packages === null ||
      typeof manifest.packages !== "object" ||
      Array.isArray(manifest.packages))
  ) {
    throw new Error(
      'module.json "packages" must be an object of name -> range',
    );
  }
  if (manifest.modules !== undefined && !Array.isArray(manifest.modules)) {
    throw new Error('module.json "modules" must be an array of module ids');
  }
  if (manifest.pairsWith !== undefined && !Array.isArray(manifest.pairsWith)) {
    throw new Error('module.json "pairsWith" must be an array of module ids');
  }
  if (
    manifest.registry !== undefined &&
    (manifest.registry === null || typeof manifest.registry !== "object")
  ) {
    throw new Error('module.json "registry" must be an object');
  }

  return manifest as unknown as ModuleManifest;
}
