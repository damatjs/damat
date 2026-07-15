import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { InstalledKitRecord } from "./types";

export const KIT_RECORD_FILENAME = "damat-kits.json";

export function recordInstalledKit(
  projectRoot: string,
  record: InstalledKitRecord,
) {
  const path = join(projectRoot, KIT_RECORD_FILENAME);
  let kits: InstalledKitRecord[] = [];
  if (existsSync(path)) {
    try {
      const parsed = JSON.parse(readFileSync(path, "utf-8")) as {
        kits?: InstalledKitRecord[];
      };
      if (Array.isArray(parsed.kits)) kits = parsed.kits;
    } catch {
      // A corrupt record is replaced with a valid record for this install.
    }
  }
  kits = [...kits.filter((kit) => kit.name !== record.name), record];
  writeFileSync(path, `${JSON.stringify({ kits }, null, 2)}\n`);
}
