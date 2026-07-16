import type { DamatManifest, ProvidedCapability } from "@damatjs/installer";

interface LegacyKit {
  name: string;
  version?: string;
  mappings?: Array<{ from: string; to: string }>;
  fallback?: string;
  ignore?: string[];
  packages?: Record<string, string>;
  notes?: string;
}

export function normalizeLegacyKit(legacy: LegacyKit): DamatManifest {
  const mappings = legacy.mappings ?? [];
  const provides = Object.fromEntries(
    mappings.map((mapping, index) => [
      index === 0 ? "files" : `files-${index + 1}`,
      { from: mapping.from, fallbackTo: mapping.to } satisfies ProvidedCapability,
    ]),
  );
  if (legacy.fallback)
    provides.unmatched = { from: "**", fallbackTo: legacy.fallback };
  return {
    schemaVersion: 1,
    kind: "kit",
    name: legacy.name,
    ...(legacy.version && { version: legacy.version }),
    install: {
      modes: ["source", "package"],
      default: "source",
      packageBackends: ["node", "damat"],
      provides,
      ...(legacy.ignore && { ignore: legacy.ignore }),
      ...(legacy.packages && { packages: legacy.packages }),
      ...(legacy.notes && { instructions: { add: [legacy.notes] } }),
    },
  };
}
