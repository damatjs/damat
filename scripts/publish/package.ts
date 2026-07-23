import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { publicationVerb, publishCommand, run } from "./commands";
import { inspectPackedTarball } from "./packed-manifest";
import type { PublishOptions, WorkspacePackage } from "./types";

export function publishPackage(
  pkg: WorkspacePackage,
  options: PublishOptions,
): boolean {
  const label = `${pkg.name}@${pkg.version}`;
  if (pkg.scripts?.prepublishOnly) {
    const guard = run(["bun", "run", "prepublishOnly"], pkg.dir);
    if (guard.status !== 0) {
      console.error(
        `- ${label}: prepublishOnly failed\n${guard.stdout}${guard.stderr}`,
      );
      return false;
    }
  }
  const destination = mkdtempSync(join(tmpdir(), "damat-publish-"));
  try {
    const packed = run(
      ["bun", "pm", "pack", "--destination", destination, "--quiet"],
      pkg.dir,
    );
    if (packed.status !== 0) {
      console.error(
        `- ${label}: pack failed\n${packed.stdout}${packed.stderr}`,
      );
      return false;
    }
    const tarball = packed.stdout.trim().split("\n").at(-1)?.trim();
    if (!tarball) {
      console.error(`- ${label}: pack returned no tarball`);
      return false;
    }
    try {
      inspectPackedTarball(resolve(destination, tarball), pkg);
    } catch (error) {
      console.error(`- ${label}: ${String(error)}`);
      return false;
    }
    const published = run(
      publishCommand(
        resolve(destination, tarball),
        pkg.version,
        options,
        process.env.NPM_DIST_TAG,
      ),
      pkg.dir,
    );
    if (published.status !== 0) {
      console.error(
        `- ${label}: publish failed\n${published.stdout}${published.stderr}`,
      );
      return false;
    }
    const provenance = options.provenance ? " with provenance" : "";
    console.log(`- ${label}: ${publicationVerb(options.dryRun)}${provenance}`);
    return true;
  } finally {
    rmSync(destination, { recursive: true, force: true });
  }
}
