import type { InstallationRecord, InstallerLock } from "../types/lockfile";
import { assertRecord, rejectUnknownKeys, requiredString } from "./assert";
import { parseInstallationRecord } from "./lock-record";

export function parseInstallerLock(input: unknown): InstallerLock {
  const record = assertRecord(input, "lockfile");
  rejectUnknownKeys(record, ["schemaVersion", "installations"]);
  if (record.schemaVersion !== 1)
    throw new TypeError("schemaVersion must be 1");
  const installations = assertRecord(record.installations, "installations");
  const parsed: Record<string, InstallationRecord> = {};
  for (const [id, value] of Object.entries(installations)) {
    requiredString({ id }, "id");
    parsed[id] = parseInstallationRecord(value);
  }
  return { schemaVersion: 1, installations: parsed };
}
