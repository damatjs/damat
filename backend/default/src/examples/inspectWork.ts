import {
  createDurableEventInspectionClient,
  createJobInspectionClient,
  getDurabilityClient,
  type DurabilityClient,
} from "@damatjs/framework";
import { referenceInspectionPolicy } from "./inspectionPolicy";

const client: DurabilityClient = {
  get pool() {
    return getDurabilityClient().pool;
  },
  query: (sql, parameters) => getDurabilityClient().query(sql, parameters),
  transaction: (run) => getDurabilityClient().transaction(run),
};

export function createReferenceInspection(cursorSigningKey: string) {
  const options = {
    cursorSigningKey,
    client,
    visibility: referenceInspectionPolicy.inspectionVisibility,
    redaction: referenceInspectionPolicy.redaction,
  };
  return {
    jobs: createJobInspectionClient(options),
    events: createDurableEventInspectionClient(options),
  };
}

export async function inspectByCorrelationId(
  correlationId: string,
  cursorSigningKey: string,
) {
  const operations = createReferenceInspection(cursorSigningKey);
  const [jobs, events] = await Promise.all([
    operations.jobs.listRuns({ correlationIds: [correlationId], limit: 25 }),
    operations.events.listEvents({ correlationId, limit: 25 }),
  ]);
  return { jobs, events };
}
