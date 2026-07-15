import type { InstallRecipe } from "../types/recipe";
import {
  assertRecord,
  optionalString,
  rejectUnknownKeys,
  requiredString,
} from "./assert";
import {
  parseInstall,
  parseMappings,
  parsePackage,
  parseUsageHints,
  stringArray,
  stringRecord,
} from "./recipe-parts";

const RECIPE_KEYS = [
  "schemaVersion",
  "id",
  "kind",
  "version",
  "install",
  "mappings",
  "ignore",
  "package",
  "packages",
  "usageHints",
];
const INSTALLATION_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function parseInstallRecipe(input: unknown): InstallRecipe {
  const record = assertRecord(input, "recipe");
  rejectUnknownKeys(record, RECIPE_KEYS);
  if (record.schemaVersion !== 1)
    throw new TypeError("schemaVersion must be 1");
  const id = requiredString(record, "id");
  if (!INSTALLATION_ID.test(id)) throw new TypeError("id must be kebab-case");
  const version = optionalString(record, "version");
  const install =
    record.install === undefined ? undefined : parseInstall(record.install);
  const mappings =
    record.mappings === undefined ? undefined : parseMappings(record.mappings);
  const ignore =
    record.ignore === undefined
      ? undefined
      : stringArray(record.ignore, "ignore");
  const packageValue =
    record.package === undefined ? undefined : parsePackage(record.package);
  const packages =
    record.packages === undefined
      ? undefined
      : stringRecord(record.packages, "packages");
  const usageHints =
    record.usageHints === undefined
      ? undefined
      : parseUsageHints(record.usageHints);
  return {
    schemaVersion: 1,
    id,
    kind: requiredString(record, "kind"),
    ...(version && { version }),
    ...(install && { install }),
    ...(mappings && { mappings }),
    ...(ignore && { ignore }),
    ...(packageValue && { package: packageValue }),
    ...(packages && { packages }),
    ...(usageHints && { usageHints }),
  };
}
