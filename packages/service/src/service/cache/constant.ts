export const DEFAULT_TTL_SECONDS = 60;

/** Cacheable read methods → position of their options argument. */
export const READ_OPTIONS_ARG: Record<string, number> = {
  find: 0,
  findMany: 0,
  count: 0,
  exists: 0,
  findById: 1,
  findOne: 1,
};

/** Mutations that invalidate the model's cached reads. */
export const WRITE_METHODS = new Set([
  "create",
  "createMany",
  "upsert",
  "upsertMany",
  "update",
  "updateOne",
  "delete",
  "softDelete",
  "restore",
]);
