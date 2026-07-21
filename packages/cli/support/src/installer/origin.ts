import { existsSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import type { OriginRequest } from "@damatjs/installer";

function npmOrigin(value: string): OriginRequest {
  const separator = value.lastIndexOf("@");
  const scopedNameOnly = value.startsWith("@") && separator === 0;
  if (separator < 1 || scopedNameOnly) return { type: "npm", name: value };
  return {
    type: "npm",
    name: value.slice(0, separator),
    version: value.slice(separator + 1),
  };
}

function gitOrigin(value: string): OriginRequest {
  const [location, ref] = value.split("#", 2);
  const url = location!.startsWith("github:")
    ? `https://github.com/${location!.slice(7)}.git`
    : location!.replace(/^git:/, "");
  return { type: "git", url, ...(ref && { ref }) };
}

export function originFromArgument(
  source: string,
  cwd: string,
  pathExists: (path: string) => boolean = existsSync,
): OriginRequest {
  if (source.startsWith("file:"))
    return { type: "local", path: resolve(cwd, source.slice(5)) };
  if (source.startsWith("registry:"))
    return { type: "registry", ref: source.slice(9) };
  if (source.startsWith("npm:")) return npmOrigin(source.slice(4));
  if (
    source.startsWith("github:") ||
    source.startsWith("git:") ||
    source.includes(".git")
  )
    return gitOrigin(source);
  if (/^https?:\/\/.+\.(?:tgz|tar\.gz)(?:#.+)?$/.test(source))
    return { type: "tarball", url: source };
  const local = isAbsolute(source) ? source : resolve(cwd, source);
  if (pathExists(local)) return { type: "local", path: local };
  return { type: "registry", ref: source };
}
