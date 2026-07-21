import { encodeCursor, type CursorPage } from "@damatjs/durability";
import { mapEventSummary } from "./list-mapper";
import { queryEventSummaryRows } from "./list-query";
import type { ResolvedEventInspectionOptions } from "./options";
import type { DurableEventFilter, EventSummary } from "./types";

export async function listInspectedEvents(
  filter: DurableEventFilter = {},
  options: ResolvedEventInspectionOptions,
): Promise<CursorPage<EventSummary>> {
  const limit = filter.limit ?? 50;
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 200) {
    throw new Error("event inspection limit must be between 1 and 200");
  }
  const resolvedFilter = filter.now ? filter : { ...filter, now: new Date() };
  const rows = await queryEventSummaryRows(
    options.client,
    resolvedFilter,
    options,
    limit,
  );
  const hasMore = rows.length > limit;
  const pageRows = hasMore ? rows.slice(0, limit) : rows;
  const items = pageRows.map((row) => mapEventSummary(row, options));
  const last = pageRows.at(-1);
  return {
    items,
    ...(hasMore && last
      ? {
          nextCursor: encodeCursor(
            { sortTimestamp: last.sort_timestamp, id: last.id },
            options.cursorSigningKey,
          ),
        }
      : {}),
  };
}
