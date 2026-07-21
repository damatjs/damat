import { Pool } from "@damatjs/deps/pg";
import {
  connectRedis,
  createDurabilityClient,
  disconnectRedis,
  DurableEventRouter,
  DurableEventWorker,
  getRedis,
  initRedis,
  JobWorker,
  setDurabilityClient,
} from "@damatjs/framework";
import { registerRecoveryDefinition, type RecoveryNames } from "./definitions";

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

const names: RecoveryNames = {
  kind: required("RECOVERY_KIND") as RecoveryNames["kind"],
  name: required("RECOVERY_NAME"),
  queue: required("RECOVERY_QUEUE"),
  consumer: required("RECOVERY_CONSUMER"),
  scope: required("RECOVERY_SCOPE"),
};
const pool = new Pool({ connectionString: required("RECOVERY_DATABASE_URL") });
setDurabilityClient(createDurabilityClient({ pool }));
registerRecoveryDefinition(names);
const redisMode = required("RECOVERY_REDIS_MODE");
initRedis({
  url: required("RECOVERY_REDIS_URL"),
  maxRetriesPerRequest: 0,
  options: { connectTimeout: 500, retryStrategy: () => null },
});
const connected = await connectRedis().then(
  () => true,
  () => false,
);
if (redisMode === "live" && !connected)
  throw new Error("Recovery Redis is down");
const wakeupRedis = getRedis();

const common = {
  concurrency: 1,
  pollIntervalMs: 10,
  leaseMs: 5_000,
  heartbeatIntervalMs: 500,
  registryHeartbeatIntervalMs: 25,
  retryIntervalMs: 10,
  reconcileIntervalMs: 10,
  reconcileBatchSize: 10,
};

const job =
  names.kind === "job"
    ? new JobWorker({ ...common, queue: names.queue, wakeupRedis })
    : undefined;
const router =
  names.kind === "event"
    ? new DurableEventRouter({
        pollIntervalMs: 10,
        retryIntervalMs: 10,
        wakeupRedis,
      })
    : undefined;
const event =
  names.kind === "event"
    ? new DurableEventWorker({
        ...common,
        wakeupRedis,
        consumers: [{ event: names.name, consumer: names.consumer }],
      })
    : undefined;

await router?.start();
await event?.start();
await job?.start();
console.log(`RECOVERY_READY:${redisMode}`);

async function shutdown() {
  await Promise.all([
    job?.stop({ graceMs: 500 }),
    event?.stop({ graceMs: 500 }),
    router?.stop(),
  ]);
  await disconnectRedis().catch(() => {});
  await pool.end();
  process.exit(0);
}

process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());
