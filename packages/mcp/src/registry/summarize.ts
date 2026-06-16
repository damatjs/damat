import type { RegistryModuleEntry } from "./types";

/**
 * The single place that decides which registry fields are surfaced to the
 * model. Extend this when you add fields to the registry schema.
 */
export function summarizeEntry(
  key: string,
  entry: RegistryModuleEntry,
): Record<string, unknown> {
  return {
    ref: key,
    description: entry.description,
    latest: entry.latest,
    versions: entry.versions ? Object.keys(entry.versions) : undefined,
    verification: entry.verification?.status ?? "unverified",
    owner: entry.owner?.namespace,
    keywords: entry.keywords,
    license: entry.license,
    source: entry.source,
    homepage: entry.homepage,
    repository: entry.repository,
  };
}
