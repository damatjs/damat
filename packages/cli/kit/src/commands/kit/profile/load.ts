import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  DAMAT_MANIFEST_FILENAME,
  parseDamatManifest,
  readDamatManifest,
  type DamatManifest,
} from "@damatjs/installer";
import { normalizeLegacyKit } from "./legacy";

export function loadKitProfile(root: string): DamatManifest {
  if (existsSync(join(root, DAMAT_MANIFEST_FILENAME))) {
    const manifest = readDamatManifest(root);
    if (manifest.kind !== "kit" && manifest.kind !== "package")
      throw new Error("kit source must have kind kit or package");
    return manifest;
  }
  const legacyPath = join(root, "damat-kit.json");
  if (!existsSync(legacyPath)) throw new Error("damat.json not found");
  const legacy = JSON.parse(readFileSync(legacyPath, "utf8"));
  return parseDamatManifest(normalizeLegacyKit(legacy));
}
