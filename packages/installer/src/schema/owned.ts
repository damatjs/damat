import type { OwnedFile, OwnedPackage } from "../types/lockfile";
import { assertRecord, rejectUnknownKeys, requiredString } from "./assert";
import { assertSafeRelativePath } from "./path";

export function parseOwnedFiles(value: unknown): OwnedFile[] {
  if (!Array.isArray(value)) throw new TypeError("files must be an array");
  return value.map((item) => {
    const record = assertRecord(item, "owned file");
    rejectUnknownKeys(record, ["path", "checksum"]);
    return {
      path: assertSafeRelativePath(requiredString(record, "path"), "path"),
      checksum: requiredString(record, "checksum"),
    };
  });
}

export function parseOwnedPackages(value: unknown): OwnedPackage[] {
  if (!Array.isArray(value)) throw new TypeError("packages must be an array");
  return value.map((item) => {
    const record = assertRecord(item, "owned package");
    rejectUnknownKeys(record, ["name", "reference"]);
    return {
      name: requiredString(record, "name"),
      reference: requiredString(record, "reference"),
    };
  });
}
