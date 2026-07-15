import { targetPathError } from "./path";

const KIT_NAME_PATTERN = /^[a-z][a-z0-9-]*$/;

export function kitManifestErrors(raw: unknown): string[] {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return ["manifest must be a JSON object"];
  }
  const manifest = raw as Record<string, unknown>;
  const errors: string[] = [];
  if (typeof manifest.name !== "string" || !KIT_NAME_PATTERN.test(manifest.name)) {
    errors.push('`name` must be kebab-case (e.g. "auth-kit")');
  }
  if (!Array.isArray(manifest.mappings)) {
    errors.push("`mappings` must be an array of { from, to }");
  } else {
    manifest.mappings.forEach((entry, index) => {
      const mapping = entry as Record<string, unknown>;
      if (typeof mapping?.from !== "string" || !mapping.from.length) {
        errors.push(`mappings[${index}].from must be a non-empty glob`);
      }
      if (typeof mapping?.to !== "string" || targetPathError(mapping.to)) {
        errors.push(`mappings[${index}].to must be a relative path inside the project (got ${JSON.stringify(mapping?.to)})`);
      }
    });
  }
  if (manifest.fallback !== undefined &&
    (typeof manifest.fallback !== "string" || targetPathError(manifest.fallback))) {
    errors.push("`fallback` must be a relative path inside the project");
  }
  if (manifest.ignore !== undefined && !Array.isArray(manifest.ignore)) {
    errors.push("`ignore` must be an array of globs");
  }
  if (manifest.packages !== undefined &&
    (typeof manifest.packages !== "object" || manifest.packages === null)) {
    errors.push("`packages` must be an object of name → range");
  }
  return errors;
}
