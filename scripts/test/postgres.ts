import { buildDatabaseUrls, testDatabases } from "./databases";
import { capture, docker } from "./docker";
import { prepareExternalPostgres } from "./external-postgres";

const image = process.env.DAMAT_TEST_POSTGRES_IMAGE ?? "pgvector/pgvector:pg16";

async function waitForPostgres(name: string): Promise<void> {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const child = Bun.spawn(
      [
        ...docker,
        "exec",
        name,
        "pg_isready",
        "-h",
        "127.0.0.1",
        "-U",
        "postgres",
        "-d",
        "damat_test",
      ],
      { stdout: "ignore", stderr: "ignore" },
    );
    if ((await child.exited) === 0) return;
    await Bun.sleep(250);
  }
  throw new Error("Timed out waiting for the test PostgreSQL container");
}

export async function startTestPostgres(): Promise<{
  name?: string;
  url: string;
  packageUrls: Record<string, string>;
}> {
  const externalUrl = process.env.DAMAT_TEST_POSTGRES_URL;
  if (externalUrl) return prepareExternalPostgres(externalUrl);

  const name = `damat-test-${crypto.randomUUID()}`;
  const password = crypto.randomUUID();
  try {
    await capture([
      ...docker,
      "run",
      "--detach",
      "--rm",
      "--name",
      name,
      "--env",
      `POSTGRES_PASSWORD=${password}`,
      "--env",
      "POSTGRES_DB=damat_test",
      "--publish",
      "127.0.0.1::5432",
      image,
    ]);
    await waitForPostgres(name);
    for (const database of Object.values(testDatabases)) {
      await capture([
        ...docker,
        "exec",
        name,
        "createdb",
        "-U",
        "postgres",
        database,
      ]);
    }
    const published = await capture([...docker, "port", name, "5432/tcp"]);
    const port = published.match(/:(\d+)$/)?.[1];
    if (!port) throw new Error(`Could not parse PostgreSQL port: ${published}`);
    const url = `postgresql://postgres:${password}@127.0.0.1:${port}/damat_test`;
    return {
      name,
      url,
      packageUrls: buildDatabaseUrls(url),
    };
  } catch (error) {
    await stopTestPostgres(name);
    throw error;
  }
}

export async function stopTestPostgres(name: string): Promise<void> {
  const child = Bun.spawn([...docker, "rm", "--force", name], {
    stdout: "ignore",
    stderr: "ignore",
  });
  await child.exited;
}
