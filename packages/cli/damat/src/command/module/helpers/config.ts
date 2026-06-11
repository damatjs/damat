import { existsSync, readFileSync, writeFileSync } from "node:fs";

/**
 * Register the module in damat.config.ts by inserting an entry into the
 * `modules: { ... }` block. Conservative by design: when the block can't be
 * located unambiguously, returns false so the caller can print manual steps
 * instead of corrupting the config.
 */
export function registerModuleInConfig(
  configPath: string,
  name: string,
  resolvePath: string,
): boolean {
  if (!existsSync(configPath)) return false;
  const content = readFileSync(configPath, "utf-8");

  const key = /^[a-z][a-zA-Z0-9]*$/.test(toCamel(name)) ? toCamel(name) : `"${name}"`;
  if (new RegExp(`(^|[\\s{,])(["']?)${name}\\2\\s*:`).test(content) && content.includes(resolvePath)) {
    return true; // already registered
  }

  const entry = `\n    ${key}: {\n      resolve: "${resolvePath}",\n      id: "${name}",\n    },`;

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

function toCamel(name: string): string {
  return name.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}
