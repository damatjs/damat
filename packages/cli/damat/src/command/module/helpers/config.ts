import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { ModuleSource } from "@damatjs/framework";

/**
 * Register the module in damat.config.ts by inserting an entry into the
 * `modules: { ... }` block. Conservative by design: when the block can't be
 * located unambiguously, returns false so the caller can print manual steps
 * instead of corrupting the config.
 *
 * When `source` is given, its provenance is written alongside `resolve`/`id`
 * so every installed module is traceable to where it came from.
 */
export function registerModuleInConfig(
  configPath: string,
  name: string,
  resolvePath: string,
  source?: ModuleSource,
): boolean {
  if (!existsSync(configPath)) return false;
  const content = readFileSync(configPath, "utf-8");

  const key = /^[a-z][a-zA-Z0-9]*$/.test(toCamel(name))
    ? toCamel(name)
    : `"${name}"`;
  if (
    new RegExp(`(^|[\\s{,])(["']?)${name}\\2\\s*:`).test(content) &&
    content.includes(resolvePath)
  ) {
    return true; // already registered
  }

  const sourceBlock = source ? `\n${serializeSource(source, "      ")}` : "";
  const entry = `\n    ${key}: {\n      resolve: "${resolvePath}",\n      id: "${name}",${sourceBlock}\n    },`;

  const modulesMatch = content.match(/modules\s*:\s*\{/);
  if (modulesMatch && modulesMatch.index !== undefined) {
    const insertAt = modulesMatch.index + modulesMatch[0].length;
    const rest = content.slice(insertAt);
    // An immediately-closing brace ("modules: {}") needs its own line
    const suffix = /^\s*\}/.test(rest) && !rest.startsWith("\n") ? "\n  " : "";
    const updated = content.slice(0, insertAt) + entry + suffix + rest;
    writeFileSync(configPath, updated);
    return true;
  }

  // No modules block — add one before the closing of defineConfig({ ... })
  const closingMatch = content.match(/\n\}\)\s*;?\s*$/);
  if (closingMatch && closingMatch.index !== undefined) {
    const block = `,\n  modules: {${entry}\n  },\n`;
    // Insert before the final "})" — only when the preceding char closes a property
    const before = content.slice(0, closingMatch.index).replace(/,\s*$/, "");
    const updated = before + block + content.slice(closingMatch.index + 1);
    writeFileSync(configPath, updated);
    return true;
  }

  return false;
}

/**
 * Ensure `links: "<linksPath>"` is present in damat.config.ts so the framework
 * boots, migrates, and type-generates the generated `src/links` tree. Conservative
 * like `registerModuleInConfig`: no-op when a `links:` key already exists (we never
 * overwrite the owner's value), and returns false when the config can't be edited
 * safely so the caller can print a manual step.
 */
export function ensureLinksInConfig(
  configPath: string,
  linksPath = "./src/links",
): boolean {
  if (!existsSync(configPath)) return false;
  const content = readFileSync(configPath, "utf-8");

  if (/\blinks\s*:/.test(content)) return true; // already configured — leave it

  const closingMatch = content.match(/\n\}\)\s*;?\s*$/);
  if (closingMatch && closingMatch.index !== undefined) {
    const before = content.slice(0, closingMatch.index).replace(/,\s*$/, "");
    const block = `,\n  links: "${linksPath}",\n`;
    const updated = before + block + content.slice(closingMatch.index + 1);
    writeFileSync(configPath, updated);
    return true;
  }

  return false;
}

/** A module's entry in damat.config.ts, as far as it can be read textually. */
export interface ModuleConfigEntry {
  /** The entry's `resolve` path, e.g. "./src/modules/user". */
  resolve?: string;
  /** The recorded provenance fields from the `source: { ... }` block. */
  source?: Partial<ModuleSource>;
}

/**
 * Best-effort read of a module's entry from damat.config.ts (the shape
 * `registerModuleInConfig` writes). Returns null when the module has no
 * entry or the config cannot be read.
 */
export function readModuleConfigEntry(
  configPath: string,
  name: string,
): ModuleConfigEntry | null {
  if (!existsSync(configPath)) return null;
  const content = readFileSync(configPath, "utf-8");
  const span = findModuleEntrySpan(content, name);
  if (!span) return null;
  const body = content.slice(span.bodyStart, span.bodyEnd);

  const entry: ModuleConfigEntry = {};
  const resolve = /resolve\s*:\s*["']([^"']*)["']/.exec(body)?.[1];
  if (resolve) entry.resolve = resolve;

  const sourceBody = /source\s*:\s*\{([\s\S]*?)\}/.exec(body)?.[1];
  if (sourceBody) {
    const source: Record<string, string> = {};
    for (const field of [
      "type",
      "ref",
      "url",
      "version",
      "owner",
      "verification",
      "integrity",
      "installedAt",
    ]) {
      const value = new RegExp(`${field}\\s*:\\s*["']([^"']*)["']`).exec(
        sourceBody,
      )?.[1];
      if (value !== undefined) source[field] = value;
    }
    if (Object.keys(source).length > 0) {
      entry.source = source as Partial<ModuleSource>;
    }
  }
  return entry;
}

/**
 * Remove the module's entry from the `modules: { ... }` block. Conservative
 * like `registerModuleInConfig`: returns false when the entry can't be located
 * unambiguously, so the caller prints manual steps instead of corrupting the
 * config.
 */
export function deregisterModuleFromConfig(
  configPath: string,
  name: string,
): boolean {
  if (!existsSync(configPath)) return false;
  const content = readFileSync(configPath, "utf-8");
  const span = findModuleEntrySpan(content, name);
  if (!span) return false;

  // Cut from the start of the entry's line through its closing `},` (plus the
  // trailing newline) so no blank hole is left behind.
  let cutStart = content.lastIndexOf("\n", span.keyStart);
  cutStart = cutStart === -1 ? 0 : cutStart;
  let cutEnd = span.entryEnd;
  if (content[cutEnd] === ",") cutEnd++;
  writeFileSync(configPath, content.slice(0, cutStart) + content.slice(cutEnd));
  return true;
}

/**
 * Locate a module entry's span inside the config text: where its key starts,
 * where its object body starts/ends (inside the braces), and where the entry
 * (including the closing brace) ends. Null when absent or unbalanced.
 */
function findModuleEntrySpan(
  content: string,
  name: string,
): {
  keyStart: number;
  bodyStart: number;
  bodyEnd: number;
  entryEnd: number;
} | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const keyMatch = new RegExp(
    `(^|[\\s{,])(["']?)${escaped}\\2\\s*:\\s*\\{`,
    "m",
  ).exec(content);
  if (!keyMatch || keyMatch.index === undefined) return null;

  const keyStart = keyMatch.index + (keyMatch[1]?.length ?? 0);
  const bodyStart = keyMatch.index + keyMatch[0].length;
  let depth = 1;
  for (let i = bodyStart; i < content.length; i++) {
    const ch = content[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        return { keyStart, bodyStart, bodyEnd: i, entryEnd: i + 1 };
      }
    }
  }
  return null;
}

function toCamel(name: string): string {
  return name.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

/** Serialize module provenance as an indented `source: { ... }` literal. */
function serializeSource(source: ModuleSource, indent: string): string {
  // Fixed order keeps the written config stable and readable.
  const order: (keyof ModuleSource)[] = [
    "type",
    "ref",
    "url",
    "version",
    "owner",
    "verification",
    "integrity",
    "installedAt",
  ];
  const lines = order
    .filter((field) => source[field] !== undefined)
    .map((field) => `${indent}  ${field}: ${JSON.stringify(source[field])},`);
  return `${indent}source: {\n${lines.join("\n")}\n${indent}},`;
}
