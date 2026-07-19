import { fileURLToPath } from "node:url";

const backendDir = fileURLToPath(
  new URL("../../backend/default/", import.meta.url),
);

export async function prepareRecoveryDatabase(url: string): Promise<void> {
  const child = Bun.spawn(["bun", "run", "db:migrate"], {
    cwd: backendDir,
    env: { ...process.env, DATABASE_URL: url, REDIS_URL: "" },
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  if ((await child.exited) !== 0) {
    throw new Error("Failed to migrate the crash-recovery test database");
  }
}
