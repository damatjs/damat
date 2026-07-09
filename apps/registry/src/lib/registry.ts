import rawData from "../../data/registry.json";

// Registry shapes — mirror packages/mcp/src/registry/types.ts (the format the
// CLI/MCP consume via DAMAT_MODULE_REGISTRY).
export interface RegistryVerification {
  status: "unverified" | "pending" | "verified" | "rejected" | "revoked";
  reason?: string;
  verifiedBy?: string;
  integrity?: string;
}

export interface RegistryModuleEntry {
  name?: string;
  source: string;
  description?: string;
  owner?: { namespace: string; verified?: boolean };
  verification?: RegistryVerification;
  versions?: Record<string, { source: string } | string>;
  latest?: string;
  keywords?: string[];
  license?: string;
  homepage?: string;
  repository?: string;
}

export interface RegistryIndex {
  modules: Record<string, RegistryModuleEntry>;
}

const data = rawData as unknown as RegistryIndex & { $comment?: string };

/** The clean machine-readable index served at /index.json. */
export function getRegistryIndex(): RegistryIndex {
  return { modules: data.modules };
}

export interface NormalizedVersion {
  version: string;
  source: string;
}

export interface Module {
  key: string;
  namespace?: string;
  name: string;
  /** Ref passed to `damat module add <installRef>`. */
  installRef: string;
  description?: string;
  latest?: string;
  versions: NormalizedVersion[];
  verified: boolean;
  status: RegistryVerification["status"];
  reason?: string;
  verifiedBy?: string;
  keywords: string[];
  license?: string;
  repository?: string;
  homepage?: string;
  source: string;
}

function compareVersionsDesc(a: string, b: string): number {
  const pa = a.split(".").map((n) => parseInt(n, 10));
  const pb = b.split(".").map((n) => parseInt(n, 10));
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return db - da;
  }
  return b.localeCompare(a);
}

function normalize(key: string, entry: RegistryModuleEntry): Module {
  const slash = key.indexOf("/");
  const namespace = slash > 0 ? key.slice(0, slash) : entry.owner?.namespace;
  const name = slash > 0 ? key.slice(slash + 1) : (entry.name ?? key);

  const versions: NormalizedVersion[] = Object.entries(entry.versions ?? {})
    .map(([version, v]) => ({
      version,
      source: typeof v === "string" ? v : v.source,
    }))
    .sort((a, b) => compareVersionsDesc(a.version, b.version));

  const status =
    entry.verification?.status ??
    (entry.owner?.verified ? "verified" : "unverified");

  return {
    key,
    ...(namespace ? { namespace } : {}),
    name,
    installRef: key,
    ...(entry.description ? { description: entry.description } : {}),
    ...(entry.latest ? { latest: entry.latest } : {}),
    versions,
    verified: status === "verified",
    status,
    ...(entry.verification?.reason
      ? { reason: entry.verification.reason }
      : {}),
    ...(entry.verification?.verifiedBy
      ? { verifiedBy: entry.verification.verifiedBy }
      : {}),
    keywords: entry.keywords ?? [],
    ...(entry.license ? { license: entry.license } : {}),
    ...(entry.repository ? { repository: entry.repository } : {}),
    ...(entry.homepage ? { homepage: entry.homepage } : {}),
    source: entry.source,
  };
}

export function getModules(): Module[] {
  return Object.entries(data.modules)
    .map(([key, entry]) => normalize(key, entry))
    .sort((a, b) => {
      // Verified first, then alphabetical.
      if (a.verified !== b.verified) return a.verified ? -1 : 1;
      return a.key.localeCompare(b.key);
    });
}

export function getModule(key: string): Module | undefined {
  const entry = data.modules[key];
  return entry ? normalize(key, entry) : undefined;
}

export function getModuleKeys(): string[] {
  return Object.keys(data.modules);
}

export function installCommand(mod: Module, version?: string): string {
  const ref = version ? `${mod.installRef}@${version}` : mod.installRef;
  return `damat module add ${ref}`;
}
