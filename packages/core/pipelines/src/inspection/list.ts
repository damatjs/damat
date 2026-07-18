import {
  decodeCursor,
  encodeCursor,
  type CursorPage,
} from "@damatjs/durability";
import type { RunRow } from "../repositories";
import { mapPipelineRun, RUN_SELECT } from "../repositories";
import {
  inspectionOptionsForManifest,
  type ResolvedPipelineInspectionOptions,
} from "./config";
import type { PipelineRunFilter, PipelineRunSummary } from "./types";
import { visibleRun } from "./visibility";

export async function listInspectedPipelineRuns(
  filter: PipelineRunFilter,
  options: ResolvedPipelineInspectionOptions,
): Promise<CursorPage<PipelineRunSummary>> {
  const limit = Math.min(Math.max(filter.limit ?? 50, 1), 200);
  const cursor = filter.cursor
    ? decodeCursor(filter.cursor, options.cursorSigningKey)
    : undefined;
  const result = await options.client.query<RunRow>(
    `${RUN_SELECT} WHERE ($1::text IS NULL OR r."status"=$1)
       AND ($2::text IS NULL OR d."name"=$2)
       AND ($3::timestamptz IS NULL OR (r."created_at",r."id")<($3,$4::uuid))
     ORDER BY r."created_at" DESC,r."id" DESC LIMIT $5`,
    [
      filter.status ?? null,
      filter.name ?? null,
      cursor?.sortTimestamp ?? null,
      cursor?.id ?? null,
      limit + 1,
    ],
  );
  const rows = result.rows.slice(0, limit);
  const last = rows.at(-1);
  return {
    items: rows.map((row) =>
      visibleRun(
        mapPipelineRun(row),
        inspectionOptionsForManifest(options, row.manifest),
      ),
    ),
    ...(result.rows.length > limit && last
      ? {
          nextCursor: encodeCursor(
            {
              sortTimestamp: last.created_at.toISOString(),
              id: last.id,
            },
            options.cursorSigningKey,
          ),
        }
      : {}),
  };
}
