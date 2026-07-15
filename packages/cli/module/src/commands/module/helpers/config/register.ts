import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { ModuleSource } from "@damatjs/framework";
import { serializeSource, toCamel } from "./serialize";

export function registerModuleInConfig(
  path: string,
  name: string,
  resolvePath: string,
  source?: ModuleSource,
): boolean {
  if (!existsSync(path)) return false;
  const content = readFileSync(path, "utf-8");
  const key = /^[a-z][a-zA-Z0-9]*$/.test(toCamel(name))
    ? toCamel(name)
    : `"${name}"`;
  if (
    new RegExp(`(^|[\\s{,])(["']?)${name}\\2\\s*:`).test(content) &&
    content.includes(resolvePath)
  )
    return true;
  const sourceBlock = source ? `\n${serializeSource(source, "      ")}` : "";
  const entry = `\n    ${key}: {\n      resolve: "${resolvePath}",\n      id: "${name}",${sourceBlock}\n    },`;
  const modules = content.match(/modules\s*:\s*\{/);
  if (modules?.index !== undefined) {
    const at = modules.index + modules[0].length;
    const rest = content.slice(at);
    const suffix = /^\s*\}/.test(rest) && !rest.startsWith("\n") ? "\n  " : "";
    writeFileSync(path, content.slice(0, at) + entry + suffix + rest);
    return true;
  }
  const closing = content.match(/\n\}\)\s*;?\s*$/);
  if (closing?.index !== undefined) {
    const block = `,\n  modules: {${entry}\n  },\n`;
    const before = content.slice(0, closing.index).replace(/,\s*$/, "");
    writeFileSync(path, before + block + content.slice(closing.index + 1));
    return true;
  }
  return false;
}

export function ensureLinksInConfig(
  path: string,
  linksPath = "./src/links",
): boolean {
  if (!existsSync(path)) return false;
  const content = readFileSync(path, "utf-8");
  if (/\blinks\s*:/.test(content)) return true;
  const closing = content.match(/\n\}\)\s*;?\s*$/);
  if (closing?.index === undefined) return false;
  const before = content.slice(0, closing.index).replace(/,\s*$/, "");
  writeFileSync(
    path,
    before + `,\n  links: "${linksPath}",\n` + content.slice(closing.index + 1),
  );
  return true;
}
