import { mapEventDetail } from "./detail-redaction";
import { queryEventDetail } from "./detail-query";
import type { ResolvedEventInspectionOptions } from "./options";
import type { DurableEventDetail } from "./types";

export function getInspectedEvent(
  id: string,
  options: ResolvedEventInspectionOptions,
): Promise<DurableEventDetail | null> {
  return options.client.transaction(async (executor) => {
    await executor.query(
      "SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY",
    );
    const data = await queryEventDetail(executor, id, options);
    return data ? mapEventDetail(data, options) : null;
  });
}
