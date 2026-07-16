import type { CommandOption } from "@damatjs/cli";

export const moduleInstallOptions: CommandOption[] = [
  { name: "mode", type: "string", description: "Install as source or package" },
  { name: "package-backend", type: "string", description: "Use node or damat package storage" },
  { name: "target", type: "string", description: "Override capability destination: capability=path" },
  { name: "dry-run", type: "boolean", description: "Plan without mutation", default: false },
  { name: "yes", type: "boolean", description: "Confirm modified owned files", default: false },
  { name: "allow-unverified", type: "boolean", description: "Allow an unverified origin", default: false },
  { name: "allow-scripts", type: "boolean", description: "Allow package lifecycle scripts", default: false },
  { name: "experimental-package", type: "boolean", description: "Opt into alpha package mode", default: false },
];
