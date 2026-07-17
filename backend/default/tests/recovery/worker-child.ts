import { recoveryRedisUrl, type RedisMode } from "./context";
import type { RecoveryNames } from "./definitions";

export type RecoveryChild = ReturnType<typeof Bun.spawn>;

export async function spawnWorker(
  names: RecoveryNames,
  redis: RedisMode,
): Promise<RecoveryChild> {
  const child = Bun.spawn(
    [process.execPath, import.meta.dir + "/worker-process.ts"],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        RECOVERY_DATABASE_URL: process.env.DAMAT_RECOVERY_DATABASE_URL!,
        RECOVERY_REDIS_URL: recoveryRedisUrl(redis),
        RECOVERY_REDIS_MODE: redis,
        RECOVERY_KIND: names.kind,
        RECOVERY_NAME: names.name,
        RECOVERY_QUEUE: names.queue,
        RECOVERY_CONSUMER: names.consumer,
        RECOVERY_SCOPE: names.scope,
      },
      stdout: "pipe",
      stderr: "inherit",
    },
  );
  await waitUntilReady(child, redis);
  return child;
}

async function waitUntilReady(child: RecoveryChild, redis: RedisMode) {
  if (!(child.stdout instanceof ReadableStream)) {
    throw new Error("Recovery worker stdout is unavailable");
  }
  const reader = child.stdout.getReader();
  const ready = await Promise.race([
    readReadyMarker(reader, redis),
    Bun.sleep(2_000).then(() => false),
  ]);
  if (!ready) await reader.cancel();
  reader.releaseLock();
  if (ready) return;
  await stopChild(child);
  throw new Error(`Recovery worker failed to connect in ${redis} mode`);
}

async function readReadyMarker(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  redis: RedisMode,
): Promise<boolean> {
  let output = "";
  while (true) {
    const next = await reader.read();
    if (next.done) return false;
    output += new TextDecoder().decode(next.value);
    if (output.includes(`RECOVERY_READY:${redis}`)) return true;
  }
}

export async function killHard(child: RecoveryChild): Promise<void> {
  process.kill(child.pid, "SIGKILL");
  await child.exited;
}

export async function stopChild(child?: RecoveryChild): Promise<void> {
  if (!child || child.exitCode !== null) return;
  try {
    process.kill(child.pid, "SIGTERM");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ESRCH") return;
    throw error;
  }
  await Promise.race([child.exited, Bun.sleep(1_000)]);
  if (child.exitCode === null) await killHard(child);
}
