import type { DamatKind, DamatManifest } from "../types/manifest";
import {
  assertRecord,
  optionalString,
  rejectUnknownKeys,
  requiredString,
} from "./assert";
import { parseInstallProfile } from "./install-profile";

export const DAMAT_MANIFEST_FILENAME = "damat.json";
const KINDS: DamatKind[] = ["application", "module", "kit", "package"];
const NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MODULE_KEYS = [
  "entry", "models", "migrations", "routes", "workflows", "jobs", "events",
  "pipelines", "links", "tests", "types", "env", "modules", "pairsWith",
  "author", "registry", "description",
];

function parseModule(value: unknown): Record<string, unknown> {
  const module = assertRecord(value, "module");
  rejectUnknownKeys(module, MODULE_KEYS);
  return module;
}

export function parseDamatManifest(input: unknown): DamatManifest {
  const record = assertRecord(input, "manifest");
  rejectUnknownKeys(record, [
    "$schema", "schemaVersion", "kind", "name", "version", "install", "module",
  ]);
  if (record.schemaVersion !== 1)
    throw new TypeError("schemaVersion must be 1");
  const kind = requiredString(record, "kind") as DamatKind;
  if (!KINDS.includes(kind)) throw new TypeError("kind is not supported");
  const name = requiredString(record, "name");
  if (!NAME.test(name)) throw new TypeError("name must be kebab-case");
  if (record.module !== undefined && kind !== "module")
    throw new TypeError("module metadata requires kind module");
  const schema = optionalString(record, "$schema");
  const version = optionalString(record, "version");
  return {
    ...(schema && { $schema: schema }),
    schemaVersion: 1,
    kind,
    name,
    ...(version && { version }),
    ...(record.install !== undefined && { install: parseInstallProfile(record.install) }),
    ...(record.module !== undefined && { module: parseModule(record.module) }),
  };
}
