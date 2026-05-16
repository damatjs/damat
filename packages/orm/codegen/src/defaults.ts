// ─── Auto-default detection ───────────────────────────────────────────────────

/**
 * Column names that are always auto-populated by the database or application
 * layer and therefore belong in the omit list of the `New*` insert type.
 *
 * The list is intentionally conservative — only columns that are universally
 * auto-managed.  Callers can extend this via `GenerateTypesOptions.autoFields`.
 */
export const DEFAULT_AUTO_FIELDS = new Set([
  "id",
  "createdAt",
  "created_at",
  "updatedAt",
  "updated_at",
]);
