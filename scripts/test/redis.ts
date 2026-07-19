import { capture, docker } from "./docker";

const image = process.env.DAMAT_TEST_REDIS_IMAGE ?? "redis:7.4-alpine";

async function waitForRedis(name: string): Promise<void> {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const child = Bun.spawn([...docker, "exec", name, "redis-cli", "ping"], {
      stdout: "ignore",
      stderr: "ignore",
    });
    if ((await child.exited) === 0) return;
    await Bun.sleep(100);
  }
  throw new Error("Timed out waiting for the test Redis container");
}

export async function startTestRedis(): Promise<{
  name: string;
  url: string;
}> {
  const name = `damat-test-redis-${crypto.randomUUID()}`;
  try {
    await capture([
      ...docker,
      "run",
      "--detach",
      "--rm",
      "--name",
      name,
      "--publish",
      "127.0.0.1::6379",
      image,
    ]);
    await waitForRedis(name);
    const published = await capture([...docker, "port", name, "6379/tcp"]);
    const port = published.match(/:(\d+)$/)?.[1];
    if (!port) throw new Error(`Could not parse Redis port: ${published}`);
    return { name, url: `redis://127.0.0.1:${port}` };
  } catch (error) {
    await stopTestRedis(name);
    throw error;
  }
}

export async function stopTestRedis(name: string): Promise<void> {
  const child = Bun.spawn([...docker, "rm", "--force", name], {
    stdout: "ignore",
    stderr: "ignore",
  });
  await child.exited;
}
