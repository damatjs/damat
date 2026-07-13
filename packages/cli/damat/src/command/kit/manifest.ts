import { join } from "node:path";
import { existsSync, readFileSync } from "node:fs";

/**
 * A "kit" is any codebase (or subdirectory of one) that ships a
 * `damat-kit.json` describing what it contains and where its files belong in
 * a RECEIVING project — the shadcn model generalized: code is copied into the
 * target as editable source, not linked like node_modules, and it works for
 * every kind of project, not just Damat apps.
 */
export const KIT_MANIFEST_FILENAME = "damat-kit.json";

/** One placement rule: files matching `from` land under `to` in the target. */
export interface KitMapping {
  /**
   * Glob over the kit's files, relative to the kit root. `*` matches within a
   * path segment, `**` across segments (e.g. "components/**", "*.md").
   */
  from: string;
  /**
   * Target directory, relative to the receiving project root. The part of a
   * file's path after the glob's static prefix is appended (so
   * "components/**" → "src/ui" places "components/nav/menu.tsx" at
   * "src/ui/nav/menu.tsx").
   */
  to: string;
}

export interface KitManifest {
  /** Kebab-case kit id — becomes directory names in the target. */
  name: string;
  description?: string;
  version?: string;
  /** Placement rules, evaluated in order — the first match wins. */
  mappings: KitMapping[];
  /**
   * Where files matched by NO mapping go (relative to the project root).
   * When omitted, unmatched files are skipped with a warning instead.
   */
  fallback?: string;
  /** Globs to exclude entirely (tests, fixtures, …). */
  ignore?: string[];
  /** npm packages the kit needs in the target (validated before install). */
  packages?: Record<string, string>;
  /** Free-form next-steps shown after install. */
  notes?: string;
}

const KIT_NAME_PATTERN = /^[a-z][a-z0-9-]*$/;

/** Load and structurally validate the kit manifest; throws with specifics. */
export function readKitManifest(kitDir: string): KitManifest {
  const manifestPath = join(kitDir, KIT_MANIFEST_FILENAME);
  if (!existsSync(manifestPath)) {
    throw new Error(
      `${KIT_MANIFEST_FILENAME} not found in ${kitDir} — a kit must describe itself (run \`damat kit init\` in the source project)`,
    );
  }
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(manifestPath, "utf-8"));
  } catch (e) {
    throw new Error(
      `${KIT_MANIFEST_FILENAME} is not valid JSON: ${e instanceof Error ? e.message : String(e)}`,
    );
  }
  const errors = kitManifestErrors(raw);
  if (errors.length > 0) {
    throw new Error(
      `${KIT_MANIFEST_FILENAME} is invalid:\n  - ${errors.join("\n  - ")}`,
    );
  }
  return raw as KitManifest;
}

/** Every structural problem in a manifest candidate (empty = valid). */
export function kitManifestErrors(raw: unknown): string[] {
  const errors: string[] = [];
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return ["manifest must be a JSON object"];
  }
  const m = raw as Record<string, unknown>;

  if (typeof m.name !== "string" || !KIT_NAME_PATTERN.test(m.name)) {
    errors.push('`name` must be kebab-case (e.g. "auth-kit")');
  }
  if (!Array.isArray(m.mappings)) {
    errors.push("`mappings` must be an array of { from, to }");
  } else {
    m.mappings.forEach((entry, i) => {
      const mapping = entry as Record<string, unknown>;
      if (typeof mapping?.from !== "string" || mapping.from.length === 0) {
        errors.push(`mappings[${i}].from must be a non-empty glob`);
      }
      if (
        typeof mapping?.to !== "string" ||
        targetPathError(mapping.to as string)
      ) {
        errors.push(
          `mappings[${i}].to must be a relative path inside the project (got ${JSON.stringify(mapping?.to)})`,
        );
      }
    });
  }
  if (
    m.fallback !== undefined &&
    (typeof m.fallback !== "string" || targetPathError(m.fallback))
  ) {
    errors.push("`fallback` must be a relative path inside the project");
  }
  if (m.ignore !== undefined && !Array.isArray(m.ignore)) {
    errors.push("`ignore` must be an array of globs");
  }
  if (
    m.packages !== undefined &&
    (typeof m.packages !== "object" || m.packages === null)
  ) {
    errors.push("`packages` must be an object of name → range");
  }
  return errors;
}

/**
 * Why a manifest-declared target path is unsafe to join onto the project
 * root (null = safe). Manifests come from other people's repositories —
 * treat every path as hostile until proven relative-and-contained. Both
 * separators are checked: on Windows `..\\x` traverses exactly like `../x`,
 * so a forward-slash-only split would wave it through.
 */
export function targetPathError(target: string): string | null {
  if (!target) return "must be non-empty";
  if (
    target.startsWith("/") ||
    target.startsWith("\\") ||
    /^[A-Za-z]:/.test(target)
  ) {
    return "must be relative";
  }
  const segments = target.split(/[\\/]+/);
  if (segments.some((s) => s === ".." || s === "."))
    return "must not contain .. or .";
  return null;
}
