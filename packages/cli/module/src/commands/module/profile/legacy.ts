import type { DamatManifest } from "@damatjs/installer";
import type { ModuleManifest } from "@damatjs/module";
import { moduleCapabilities } from "./capabilities";
import { moduleInstructions } from "./instructions";

export function normalizeLegacyModule(
  manifest: ModuleManifest,
  prefix = "",
): DamatManifest {
  return {
    schemaVersion: 1,
    kind: "module",
    name: manifest.name,
    ...(manifest.version && { version: manifest.version }),
    install: {
      modes: ["source", "package"],
      default: "source",
      packageBackends: ["node", "damat"],
      provides: moduleCapabilities(prefix),
      ...(manifest.packages && { packages: manifest.packages }),
      usageHints: [{ token: manifest.name }],
      instructions: moduleInstructions(manifest.name),
    },
    module: {
      ...(manifest.description && { description: manifest.description }),
      ...(manifest.author && { author: manifest.author }),
      ...(manifest.env && { env: manifest.env }),
      ...(manifest.modules && { modules: manifest.modules }),
      ...(manifest.pairsWith && { pairsWith: manifest.pairsWith }),
      ...(manifest.registry && { registry: manifest.registry }),
      ...manifest.paths,
    },
  };
}
