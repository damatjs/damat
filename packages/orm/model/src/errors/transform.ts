/**
 * Error transformer - Convert Postgres errors to ORM errors
 */

import { QueryError, DuplicateError } from "./index";

interface PostgresError extends Error {
  code?: string;
  detail?: string;
  constraint?: string;
  table?: string;
  column?: string;
}

const PG_ERROR_CODES = {
  UNIQUE_VIOLATION: "23505",
  NOT_NULL_VIOLATION: "23502",
  FOREIGN_KEY_VIOLATION: "23503",
  CHECK_VIOLATION: "23514",
  DOES_NOT_EXIST: "42P01",
  DUPLICATE_TABLE: "42P07",
} as const;

export function transformPgError(
  error: PostgresError,
  sql?: string,
  params?: unknown[],
): Error {
  const code = error.code;

  switch (code) {
    case PG_ERROR_CODES.UNIQUE_VIOLATION:
      const match = error.detail?.match(/\(([^)]+)\)=\(([^)]+)\)/);
      if (match) {
        return new DuplicateError(
          error.table || "Record",
          match[1] ?? "",
          match[2],
        );
      }
      return new DuplicateError("Record", "field", "value");

    case PG_ERROR_CODES.DOES_NOT_EXIST:
      return new QueryError(
        `Table does not exist: ${error.message}`,
        sql || "",
        params,
        { pgError: error },
      );

    default:
      return new QueryError(error.message, sql || "", params, {
        pgError: error,
        code,
      });
  }
}
