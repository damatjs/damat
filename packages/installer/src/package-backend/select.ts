import type { InstallMode, PackageBackend } from "../types";

export interface SelectPackageBackendInput {
  mode: InstallMode;
  requested?: PackageBackend;
  supported?: PackageBackend[];
  experimentalPackage?: boolean;
}

export function selectPackageBackend(
  input: SelectPackageBackendInput,
): PackageBackend | undefined {
  if (input.mode === "source") {
    if (input.requested)
      throw new Error("package backend is only valid with package mode");
    return undefined;
  }
  if (!input.experimentalPackage)
    throw new Error("package mode requires --experimental-package");
  const backend = input.requested ?? "node";
  if (input.supported && !input.supported.includes(backend))
    throw new Error(`package backend is not supported: ${backend}`);
  return backend;
}
