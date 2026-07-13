import type { RegistryModuleEntry, RegistryVerdict } from "./types";

/**
 * The single place that decides which registry fields are surfaced to the
 * model. Extend this when you add fields to the registry schema.
 *
 * Pass `verdict` to override/supplement the static verdict baked into the
 * entry (e.g. a live verdict fetched from the gateway for module_info).
 */
export function summarizeEntry(
  key: string,
  entry: RegistryModuleEntry,
  verdict?: RegistryVerdict | null,
): Record<string, unknown> {
  // Prefer the live/passed verdict over a static one in the entry; fall back
  // to the entry's static verdict; omit entirely when neither is present.
  const resolvedVerdict: RegistryVerdict | undefined =
    verdict ?? entry.verdict ?? undefined;

  return {
    ref: key,
    description: entry.description,
    latest: entry.latest,
    versions: entry.versions ? Object.keys(entry.versions) : undefined,
    verification: entry.verification?.status ?? "unverified",
    verdict: resolvedVerdict
      ? {
          status: resolvedVerdict.status,
          score: resolvedVerdict.score ?? null,
          reasons: resolvedVerdict.reasons ?? null,
          summary: resolvedVerdict.summary ?? null,
        }
      : undefined,
    owner: entry.owner?.namespace,
    keywords: entry.keywords,
    license: entry.license,
    source: entry.source,
    homepage: entry.homepage,
    repository: entry.repository,
  };
}
