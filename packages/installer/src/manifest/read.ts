import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DAMAT_MANIFEST_FILENAME, parseDamatManifest } from "../schema";
import type { DamatManifest } from "../types";

export function readDamatManifest(root: string): DamatManifest {
  const path = join(root, DAMAT_MANIFEST_FILENAME);
  if (!existsSync(path))
    throw new Error(`${DAMAT_MANIFEST_FILENAME} not found`);
  let input: unknown;
  try {
    input = JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`invalid ${DAMAT_MANIFEST_FILENAME}`, { cause: error });
  }
  return parseDamatManifest(input);
}
