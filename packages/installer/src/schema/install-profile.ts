import type {
  DamatInstallProfile,
  InstallInstructions,
  PackageBackend,
} from "../types/manifest";
import { assertRecord, rejectUnknownKeys } from "./assert";
import { stringArray, stringRecord } from "./collections";
import { parseProvides, parseAccepts } from "./capabilities";
import { parseInstall, parseUsageHints } from "./recipe-parts";

const KEYS = [
  "modes", "default", "packageBackends", "provides", "accepts", "ignore",
  "packages", "usageHints", "instructions",
];

function parseBackends(value: unknown): PackageBackend[] {
  const values = stringArray(value, "packageBackends");
  values.forEach((backend, index) => {
    if (backend !== "node" && backend !== "damat")
      throw new TypeError(`packageBackends[${index}] is not supported`);
  });
  if (new Set(values).size !== values.length)
    throw new TypeError("packageBackends must be unique");
  return values as PackageBackend[];
}

function parseInstructions(value: unknown): InstallInstructions {
  const record = assertRecord(value, "instructions");
  rejectUnknownKeys(record, ["add", "remove"]);
  return {
    ...(record.add !== undefined && { add: stringArray(record.add, "add") }),
    ...(record.remove !== undefined && {
      remove: stringArray(record.remove, "remove"),
    }),
  };
}

export function parseInstallProfile(value: unknown): DamatInstallProfile {
  const record = assertRecord(value, "install");
  rejectUnknownKeys(record, KEYS);
  const mode = record.modes === undefined
    ? undefined
    : parseInstall({ modes: record.modes, default: record.default });
  if (record.default !== undefined && !mode)
    throw new TypeError("default requires modes");
  const profile: DamatInstallProfile = {
    ...(record.packageBackends !== undefined && {
      packageBackends: parseBackends(record.packageBackends),
    }),
    ...(record.provides !== undefined && { provides: parseProvides(record.provides) }),
    ...(record.accepts !== undefined && { accepts: parseAccepts(record.accepts) }),
    ...(record.ignore !== undefined && { ignore: stringArray(record.ignore, "ignore") }),
    ...(record.packages !== undefined && { packages: stringRecord(record.packages, "packages") }),
    ...(record.usageHints !== undefined && { usageHints: parseUsageHints(record.usageHints) }),
    ...(record.instructions !== undefined && { instructions: parseInstructions(record.instructions) }),
  };
  if (mode) Object.assign(profile, mode);
  return profile;
}
