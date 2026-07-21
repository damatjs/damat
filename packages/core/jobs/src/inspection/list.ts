import { encodeCursor, type CursorPage } from "@damatjs/durability";
import type { ResolvedInspectionOptions } from "./config";
import { resolveListRequest } from "./list/params";
import { listRunsSql } from "./list/query";
import { mapRunSummary, type InspectionRunRow } from "./list/rows";
import type { JobRunFilter, JobRunSummary } from "./types";

export async function listInspectedJobRuns(
  filter: JobRunFilter,
  options: ResolvedInspectionOptions,
): Promise<CursorPage<JobRunSummary>> {
  const request = resolveListRequest(filter, options);
  const result = await options.client.query<InspectionRunRow>(
    listRunsSql,
    request.params,
  );
  const rows = result.rows.slice(0, request.limit);
  const last = rows.at(-1);
  return {
    items: rows.map((row) => mapRunSummary(row, options)),
    ...(result.rows.length > request.limit && last
      ? {
          nextCursor: encodeCursor(
            { sortTimestamp: last.cursor_at.toISOString(), id: last.id },
            options.cursorSigningKey,
          ),
        }
      : {}),
  };
}
