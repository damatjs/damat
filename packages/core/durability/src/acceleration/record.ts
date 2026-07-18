import { getDurabilityClient } from "../client/global";
import type { AccelerationSignalInput } from "./types";

export async function recordAccelerationSignal(
  input: AccelerationSignalInput,
): Promise<string> {
  const id = crypto.randomUUID();
  const executor = input.executor ?? getDurabilityClient();
  await executor.query(
    `INSERT INTO "_damat_acceleration_outbox"
      ("id","topic","resource_kind","resource_id","scope","payload","available_at")
     VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7)`,
    [
      id,
      input.topic,
      input.kind,
      input.resourceId ?? null,
      input.scope ?? null,
      JSON.stringify(input.payload ?? {}),
      input.availableAt ?? new Date(),
    ],
  );
  return id;
}
