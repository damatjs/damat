import { spawnSync } from "node:child_process";
import type { CommandResult, PublishOptions } from "./types";

export function run(command: string[], cwd: string): CommandResult {
  const result = spawnSync(command[0], command.slice(1), {
    cwd,
    encoding: "utf8",
  });
  return {
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

export function isPublished(name: string, version: string, root: string) {
  const result = run(
    ["npm", "view", `${name}@${version}`, "version", "--json"],
    root,
  );
  if (result.status === 0 && result.stdout.trim()) return true;
  if (result.stderr.includes("E404") || result.stdout.includes("E404"))
    return false;
  throw new Error(
    `npm view failed for ${name}@${version}:\n${result.stderr || result.stdout}`,
  );
}

export function distTagFor(version: string, override?: string) {
  const prerelease = /^\d+\.\d+\.\d+-([0-9A-Za-z-]+)/.exec(version)?.[1];
  const tag = override?.trim() || prerelease;
  if (!tag) return undefined;
  if (!/^[A-Za-z][0-9A-Za-z-]*$/.test(tag))
    throw new Error(`Invalid npm dist-tag "${tag}"`);
  const normalized = tag.toLowerCase();
  if (prerelease && normalized === "latest")
    throw new Error(`Prerelease ${version} cannot use npm dist-tag "latest"`);
  return normalized;
}

export function publishCommand(
  tarball: string,
  version: string,
  options: PublishOptions,
  tagOverride?: string,
) {
  const command = ["npm", "publish", tarball, "--access", "public"];
  const tag = distTagFor(version, tagOverride);
  if (tag) command.push("--tag", tag);
  if (options.provenance) command.push("--provenance");
  if (options.dryRun) command.push("--dry-run");
  return command;
}

export function publicationVerb(dryRun: boolean): string {
  return dryRun ? "dry-run validated" : "published";
}

export function publicationSummary(count: number, dryRun: boolean): string {
  return `${count} ${dryRun ? "validated by dry run" : "published"}`;
}
