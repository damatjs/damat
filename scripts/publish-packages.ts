/**
 * Publish all public workspace packages under packages/ to npm.
 *
 * Why not `changeset publish`: internal dependencies use the `workspace:*`
 * protocol, which must be rewritten to concrete versions at pack time.
 * `changeset publish` shells out to `npm publish`, and npm does NOT rewrite
 * `workspace:*` — it would ship literal `workspace:*` ranges that break every
 * consumer install. `bun pm pack` performs the rewrite, and `bun publish`
 * does not support npm provenance, so the flow is:
 *
 *   for each public package (skipping versions already on the registry):
 *     1. run its `prepublishOnly` guard (npm skips lifecycle scripts when
 *        publishing a prebuilt tarball, so we run it explicitly)
 *     2. `bun pm pack`   — tarball with workspace:* rewritten to versions
 *     3. `npm publish <tarball>` — with `--provenance` when running in
 *        GitHub Actions (requires `id-token: write` on the job)
 *
 * Skipping already-published versions keeps the script idempotent (safe to
 * re-run after a partial failure) and mirrors `changeset publish` semantics.
 * Changesets is still used for versioning (`changeset` / `changeset version`).
 *
 * Usage: bun scripts/publish-packages.ts [--dry-run]
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dir, "..");
const DRY_RUN = process.argv.includes("--dry-run");
// npm provenance only works in a supported CI environment with an OIDC token.
const WITH_PROVENANCE = process.env.GITHUB_ACTIONS === "true";

// Workspace globs from the root package.json that live under packages/.
// (backend/* and modules/* workspaces are app/dev-only and never published.)
const PACKAGE_GLOBS = [
  "packages/*",
  "packages/auth/*",
  "packages/cli/*",
  "packages/core/*",
  "packages/orm/*",
];

interface Pkg {
  dir: string;
  name: string;
  version: string;
  private?: boolean;
  scripts?: Record<string, string>;
}

function discoverPackages(): Pkg[] {
  const pkgs: Pkg[] = [];
  for (const glob of PACKAGE_GLOBS) {
    const base = join(ROOT, glob.replace("/*", ""));
    if (!existsSync(base)) continue;
    for (const entry of new Bun.Glob("*/package.json").scanSync({
      cwd: base,
    })) {
      const dir = join(base, entry, "..");
      const manifest = JSON.parse(
        readFileSync(join(dir, "package.json"), "utf-8"),
      );
      // packages/cli, packages/core, packages/orm are matched by packages/*
      // too but contain no package.json themselves; dedupe by name.
      if (pkgs.some((p) => p.name === manifest.name)) continue;
      pkgs.push({
        dir,
        name: manifest.name,
        version: manifest.version,
        private: manifest.private,
        scripts: manifest.scripts,
      });
    }
  }
  return pkgs.filter((p) => !p.private);
}

function run(
  cmd: string[],
  cwd: string,
): { status: number; stdout: string; stderr: string } {
  const res = spawnSync(cmd[0], cmd.slice(1), { cwd, encoding: "utf-8" });
  return {
    status: res.status ?? 1,
    stdout: res.stdout ?? "",
    stderr: res.stderr ?? "",
  };
}

/** true = already on the registry, false = not published (E404). */
function isPublished(name: string, version: string): boolean {
  const res = run(
    ["npm", "view", `${name}@${version}`, "version", "--json"],
    ROOT,
  );
  if (res.status === 0 && res.stdout.trim().length > 0) return true;
  if (res.stderr.includes("E404") || res.stdout.includes("E404")) return false;
  // Anything else (network/auth error) must not silently skip or publish.
  throw new Error(
    `npm view failed for ${name}@${version}:\n${res.stderr || res.stdout}`,
  );
}

const packages = discoverPackages();
console.log(
  `Found ${packages.length} public packages${DRY_RUN ? " (dry run)" : ""}.`,
);

const failures: string[] = [];
let published = 0;

for (const pkg of packages) {
  const label = `${pkg.name}@${pkg.version}`;
  if (isPublished(pkg.name, pkg.version)) {
    console.log(`- ${label}: already published, skipping`);
    continue;
  }

  if (pkg.scripts?.prepublishOnly) {
    const guard = run(["bun", "run", "prepublishOnly"], pkg.dir);
    if (guard.status !== 0) {
      console.error(
        `- ${label}: prepublishOnly guard failed\n${guard.stdout}${guard.stderr}`,
      );
      failures.push(label);
      continue;
    }
  }

  const dest = mkdtempSync(join(tmpdir(), "damat-publish-"));
  try {
    const pack = run(
      ["bun", "pm", "pack", "--destination", dest, "--quiet"],
      pkg.dir,
    );
    if (pack.status !== 0) {
      console.error(
        `- ${label}: bun pm pack failed\n${pack.stdout}${pack.stderr}`,
      );
      failures.push(label);
      continue;
    }
    const tarball = pack.stdout.trim().split("\n").at(-1)!.trim();

    const publishCmd = ["npm", "publish", tarball, "--access", "public"];
    if (WITH_PROVENANCE) publishCmd.push("--provenance");
    if (DRY_RUN) publishCmd.push("--dry-run");

    const pub = run(publishCmd, pkg.dir);
    if (pub.status !== 0) {
      console.error(
        `- ${label}: npm publish failed\n${pub.stdout}${pub.stderr}`,
      );
      failures.push(label);
      continue;
    }
    console.log(
      `- ${label}: published${WITH_PROVENANCE ? " (with provenance)" : ""}`,
    );
    published += 1;
  } finally {
    rmSync(dest, { recursive: true, force: true });
  }
}

console.log(`\nDone: ${published} published, ${failures.length} failed.`);
if (failures.length > 0) {
  console.error(`Failed packages: ${failures.join(", ")}`);
  process.exit(1);
}
