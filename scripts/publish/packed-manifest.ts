import { resolve } from "node:path";
import { run } from "./commands";
import type { WorkspacePackage } from "./types";

type Dependencies = Record<string, string>;

interface PackedManifest {
  name?: string;
  version?: string;
  dependencies?: Dependencies;
  optionalDependencies?: Dependencies;
  peerDependencies?: Dependencies;
}

const RUNTIME_FIELDS = [
  "dependencies",
  "optionalDependencies",
  "peerDependencies",
] as const;

export function validatePackedManifest(
  manifest: PackedManifest,
  pkg: WorkspacePackage,
): void {
  if (manifest.name !== pkg.name || manifest.version !== pkg.version)
    throw new Error(
      `packed manifest is ${manifest.name}@${manifest.version}; expected ${pkg.name}@${pkg.version}`,
    );
  for (const field of RUNTIME_FIELDS) {
    for (const [name, range] of Object.entries(manifest[field] ?? {})) {
      if (name.startsWith("@damatjs/") && range !== pkg.version)
        throw new Error(
          `${pkg.name} ${field} pins ${name}@${range}; expected ${pkg.version}`,
        );
    }
  }
}

export function inspectPackedTarball(
  tarball: string,
  pkg: WorkspacePackage,
): void {
  const result = run(
    ["tar", "-xOf", resolve(tarball), "package/package.json"],
    pkg.dir,
  );
  if (result.status !== 0)
    throw new Error(
      `cannot inspect ${tarball}: ${result.stderr || result.stdout}`,
    );
  validatePackedManifest(JSON.parse(result.stdout) as PackedManifest, pkg);
}
