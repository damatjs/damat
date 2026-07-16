import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import type { RegistryDescriptor, VerificationStatus } from "@damatjs/installer";
import { originFromArgument } from "./origin";

interface RegistryEntry {
  source: string;
  owner?: { namespace?: string };
  verification?: { status?: string; integrity?: string };
  versions?: Record<string, string | { source: string }>;
}

interface RegistryIndex {
  modules: Record<string, RegistryEntry>;
}

export interface RegistryIo {
  exists(path: string): boolean;
  isDirectory(path: string): boolean;
  read(path: string): string;
  fetch(url: string): Promise<{
    ok: boolean;
    status: number;
    json(): Promise<unknown>;
  }>;
}

function splitRef(ref: string): { key: string; version?: string } {
  const separator = ref.lastIndexOf("@");
  if (separator < 1) return { key: ref };
  return { key: ref.slice(0, separator), version: ref.slice(separator + 1) };
}

function verification(value?: string): VerificationStatus | undefined {
  if (value === "verified" || value === "rejected" || value === "revoked") return value;
  return value ? "unverified" : undefined;
}

export function registryDescriptor(
  index: RegistryIndex,
  ref: string,
  cwd: string,
): RegistryDescriptor {
  const { key, version } = splitRef(ref);
  const entry = index.modules[key] ?? Object.entries(index.modules)
    .find(([name]) => name.split("/").at(-1) === key)?.[1];
  if (!entry) throw new Error(`registry entry not found: ${ref}`);
  const versioned = version ? entry.versions?.[version] : undefined;
  if (version && !versioned) throw new Error(`registry version not found: ${ref}`);
  const source = typeof versioned === "string" ? versioned : versioned?.source ?? entry.source;
  const status = verification(entry.verification?.status);
  return {
    origin: originFromArgument(source, cwd),
    ...(entry.owner?.namespace && { owner: entry.owner.namespace }),
    ...(status && { verification: status }),
    ...(entry.verification?.integrity && { integrity: entry.verification.integrity }),
  };
}

export async function loadRegistryIndex(
  location: string,
  io?: RegistryIo,
): Promise<RegistryIndex> {
  if (/^https?:\/\//.test(location)) {
    const response = await (io ? io.fetch(location) : fetch(location));
    if (!response.ok) throw new Error(`registry request failed: ${response.status}`);
    return await response.json() as RegistryIndex;
  }
  const isDirectory = io
    ? io.exists(location) && io.isDirectory(location)
    : existsSync(location) && statSync(location).isDirectory();
  const path = isDirectory
    ? join(location, "registry.json") : location;
  const content = io ? io.read(path) : readFileSync(path, "utf8");
  return JSON.parse(content) as RegistryIndex;
}

export function createRegistryResolver(cwd: string, io?: RegistryIo) {
  return async (ref: string): Promise<RegistryDescriptor> => {
    const location = process.env.DAMAT_MODULE_REGISTRY ?? process.env.DAMAT_REGISTRY;
    if (!location) throw new Error("registry acquisition requires DAMAT_REGISTRY");
    return registryDescriptor(await loadRegistryIndex(location, io), ref, cwd);
  };
}
