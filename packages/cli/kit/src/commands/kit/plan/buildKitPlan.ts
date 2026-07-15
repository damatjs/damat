import { sep } from "node:path";
import type { KitManifest } from "../manifest";
import { globToRegExp, staticPrefix } from "./glob";
import { listKitFiles } from "./listKitFiles";
import type { KitPlan, PlannedFile } from "./types";

const joinRelative = (base: string, rest: string) =>
  [...base.split("/"), ...rest.split("/")].filter(Boolean).join(sep);

export function buildKitPlan(kitDir: string, manifest: KitManifest): KitPlan {
  const matchers = manifest.mappings.map((mapping) => ({
    to: mapping.to,
    regex: globToRegExp(mapping.from),
    prefix: staticPrefix(mapping.from),
  }));
  const files: PlannedFile[] = [];
  const unmatched: string[] = [];
  for (const source of listKitFiles(kitDir, manifest.ignore ?? [])) {
    const mapping = matchers.find((item) => item.regex.test(source));
    if (mapping) {
      const rest = mapping.prefix && source.startsWith(mapping.prefix)
        ? source.slice(mapping.prefix.length)
        : source;
      files.push({ source, target: joinRelative(mapping.to, rest), via: "mapping" });
    } else if (manifest.fallback) {
      files.push({ source, target: joinRelative(manifest.fallback, source), via: "fallback" });
    } else unmatched.push(source);
  }
  return { files, unmatched };
}
