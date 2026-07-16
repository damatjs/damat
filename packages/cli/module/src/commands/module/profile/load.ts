import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  DAMAT_MANIFEST_FILENAME,
  readDamatManifest,
  type DamatManifest,
} from "@damatjs/installer";
import { readModuleManifest } from "@damatjs/module";
import { normalizeLegacyModule } from "./legacy";

export interface ProfileReaders {
  exists(path: string): boolean;
  universal(root: string): DamatManifest;
  legacy(root: string): ReturnType<typeof readModuleManifest>;
}

const readers: ProfileReaders = {
  exists: existsSync,
  universal: readDamatManifest,
  legacy: readModuleManifest,
};

export function loadModuleProfile(
  root: string,
  io: ProfileReaders = readers,
): DamatManifest {
  if (io.exists(join(root, DAMAT_MANIFEST_FILENAME))) {
    const manifest = io.universal(root);
    if (manifest.kind !== "module") throw new Error("damat.json kind must be module");
    return manifest;
  }
  const legacyRoot = io.exists(join(root, "module.json")) ? root : join(root, "src");
  const prefix = legacyRoot === root ? "" : "src/";
  return normalizeLegacyModule(io.legacy(legacyRoot), prefix);
}
