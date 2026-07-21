export const installOptionProperties = {
  mode: {
    type: "string",
    enum: ["source", "package"],
    description: "Install mode; source is the stable default.",
  },
  packageBackend: {
    type: "string",
    enum: ["node", "damat"],
    description: "Package storage backend for experimental package mode.",
  },
  target: {
    type: "array",
    items: { type: "string" },
    description: "Capability destination overrides as capability=path.",
  },
  dryRun: { type: "boolean", description: "Plan without mutation." },
  yes: {
    type: "boolean",
    description: "Confirm overwriting modified installer-owned files.",
  },
  allowUnverified: {
    type: "boolean",
    description: "Allow the exact unverified origin approved by the user.",
  },
  allowScripts: {
    type: "boolean",
    description: "Allow dependency lifecycle scripts.",
  },
  experimentalPackage: {
    type: "boolean",
    description: "Opt into early-alpha package installation mode.",
  },
} as const;

export function appendInstallOptions(
  args: string[],
  input: Record<string, unknown>,
): void {
  if (input.mode) args.push("--mode", String(input.mode));
  if (input.packageBackend) {
    args.push("--package-backend", String(input.packageBackend));
  }
  if (Array.isArray(input.target)) {
    input.target.forEach((target) => args.push("--target", String(target)));
  }
  if (input.dryRun) args.push("--dry-run");
  if (input.yes) args.push("--yes");
  if (input.allowUnverified) args.push("--allow-unverified");
  if (input.allowScripts) args.push("--allow-scripts");
  if (input.experimentalPackage) args.push("--experimental-package");
}
