interface DurableResult {
  job: string;
  pipeline: string;
  events: Array<{ consumer: string; status: string }>;
}

export async function exerciseModuleDev(url: string): Promise<{
  health: number;
  record: number;
  durable: DurableResult;
}> {
  const health = await fetch(`${url}/health`).then(
    (response) => response.status,
  );
  const record = await fetch(`${url}/api/records`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: crypto.randomUUID(), value: "cli" }),
  }).then((response) => response.status);
  const durable = await fetch(`${url}/api/durable`, {
    method: "POST",
  }).then((response) => response.json() as Promise<DurableResult>);
  return { health, record, durable };
}

export async function activeWorkerCount(url: string): Promise<number> {
  const result = await fetch(`${url}/api/durable`).then(
    (response) => response.json() as Promise<{ active: number }>,
  );
  return result.active;
}

export function migrationCheckCount(output: string): number {
  return (
    output.match(
      /standalone-durable-fixture: (?:No pending migrations|Running \d+ migration)/g,
    ) ?? []
  ).length;
}
