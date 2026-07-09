import fs from "node:fs";
import path from "node:path";
import { REPO_ROOT } from "@/lib/data/repo";

/** A module entry from the live registry (apps/registry/data/registry.json). */
export interface RegistryModule {
  /** Registry key, e.g. `damatjs/user` or a bare `billing`. */
  id: string;
  description: string;
  latest: string;
  verified: boolean;
  keywords: string[];
  license: string | null;
  repository: string | null;
  homepage: string | null;
  /** Known versions, newest first. */
  versions: string[];
  /** Copy-paste install command. */
  install: string;
}

interface RegistryEntryJson {
  description?: string;
  latest?: string;
  versions?: Record<string, unknown>;
  owner?: { namespace?: string; verified?: boolean };
  verification?: { status?: string };
  keywords?: string[];
  license?: string;
  repository?: string;
  homepage?: string;
}

function compareSemverDesc(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pb[i] ?? 0) - (pa[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** Read the live registry index — the same file served at registry.damatjs.com/index.json. */
export function getRegistryModules(): RegistryModule[] {
  const raw = fs.readFileSync(
    path.join(REPO_ROOT, "apps", "registry", "data", "registry.json"),
    "utf8",
  );
  const parsed = JSON.parse(raw) as {
    modules?: Record<string, RegistryEntryJson>;
  };

  return Object.entries(parsed.modules ?? {}).map(([id, entry]) => {
    const versions = Object.keys(entry.versions ?? {}).sort(compareSemverDesc);
    const latest = entry.latest ?? versions[0] ?? "";
    return {
      id,
      description: entry.description ?? "",
      latest,
      verified: entry.verification?.status === "verified",
      keywords: entry.keywords ?? [],
      license: entry.license ?? null,
      repository: entry.repository ?? null,
      homepage: entry.homepage ?? null,
      versions,
      install: latest
        ? `damat module add ${id}@${latest}`
        : `damat module add ${id}`,
    };
  });
}
