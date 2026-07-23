import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { inspectPackedTarball } from "../../publish/packed-manifest";
import { discoverPackages } from "../../publish/workspaces";
import { runProcess } from "./process";

export interface ReleaseConsumer {
  root: string;
  cli: string;
  cleanup: () => void;
}

export async function createReleaseConsumer(
  repository: string,
): Promise<ReleaseConsumer> {
  const root = mkdtempSync(join(tmpdir(), "damat-release-consumer-"));
  const packs = join(root, "packs");
  const temporary = join(root, "tmp");
  mkdirSync(packs);
  mkdirSync(temporary);
  const dependencies: Record<string, string> = {};
  for (const pkg of discoverPackages(repository)) {
    const packed = await runProcess(
      [process.execPath, "pm", "pack", "--destination", packs, "--quiet"],
      pkg.dir,
    );
    if (packed.code !== 0) throw new Error(packed.output);
    const name = packed.output.trim().split("\n").at(-1);
    if (!name) throw new Error(`${pkg.name} pack returned no tarball`);
    const tarball = resolve(packs, name);
    inspectPackedTarball(tarball, pkg);
    dependencies[pkg.name] = `file:./packs/${basename(tarball)}`;
  }
  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({
      name: "release-consumer",
      private: true,
      dependencies,
      overrides: dependencies,
    }),
  );
  const install = await runProcess(
    [process.execPath, "install", "--ignore-scripts"],
    root,
    { ...process.env, TMPDIR: temporary },
  );
  if (install.code !== 0) throw new Error(install.output);
  return {
    root,
    cli: join(root, "node_modules/@damatjs/damat-cli/dist/cli.js"),
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}
