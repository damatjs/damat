// ─── Options ──────────────────────────────────────────────────────────────────

export interface GenerateTypesOptions {
  /**
   * Column names that are always auto-generated and must be excluded from the
   * `New*` insert type.  Merged with the built-in set:
   * `id`, `createdAt`, `created_at`, `updatedAt`, `updated_at`.
   */
  autoFields?: string[];

  /**
   * Prepend a banner comment to the output file, e.g. a "do not edit" notice.
   * Defaults to a standard generated-file warning.
   */
  banner?: string | false;
}

// ─── Multi-file result ────────────────────────────────────────────────────────

/**
 * Result of `generateFilesMap()`.
 *
 * Keys are relative file names (e.g. `"product.ts"`, `"index.ts"`).
 * Values are the full contents of the corresponding `.ts` file, ready to be
 * written to disk.
 */
export type GeneratedFilesMap = Map<string, string>;
