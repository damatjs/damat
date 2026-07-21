import {
  formatModuleRef,
  parseModuleRef,
  resolveRegistryEntry,
} from "@damatjs/module";
import type { ResolvedModuleSource } from "../types";

export async function resolveRegistrySource(
  source: string,
  resolveInner: (source: string) => Promise<ResolvedModuleSource>,
): Promise<ResolvedModuleSource | null> {
  const moduleRef = parseModuleRef(source);
  if (!moduleRef) return null;
  const record = await resolveRegistryEntry(moduleRef);
  if (record) {
    const inner = await resolveInner(record.source);
    return {
      ...inner,
      registry: record,
      origin: {
        type: "registry",
        ref: formatModuleRef(moduleRef),
        url: record.source,
        version: record.version,
        owner: record.owner?.namespace,
        verification: record.verification.status,
        integrity: record.integrity,
      },
    };
  }
  if (!source.includes("/")) {
    throw new Error(
      `"${formatModuleRef(moduleRef)}" is a registry module reference but no registry knows it — set DAMAT_MODULE_REGISTRY or use a local path / git source.`,
    );
  }
  return null;
}
