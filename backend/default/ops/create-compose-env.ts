import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const secret = () => crypto.getRandomValues(new Uint8Array(32)).toHex();
const values: Record<string, string> = {};
for (const name of [
  "POSTGRES_PASSWORD",
  "DAMAT_MIGRATOR_PASSWORD",
  "DAMAT_RUNTIME_PASSWORD",
  "DAMAT_BACKUP_PASSWORD",
  "RESTORE_PASSWORD",
  "REDIS_PASSWORD",
  "METRICS_TOKEN",
])
  values[name] = secret();
const git = Bun.spawnSync(["git", "rev-parse", "--short=12", "HEAD"]);
const revision =
  git.exitCode === 0 ? git.stdout.toString().trim() : secret().slice(0, 12);
Object.assign(values, {
  NODE_ENV: "production",
  PUBLIC_BASE_URL: "https://staging.invalid",
  RELEASE_VERSION: `staging-${revision}`,
  REDIS_URL: `redis://damat:${values.REDIS_PASSWORD}@redis:6379`,
  DATABASE_URL: `postgresql://damat_runtime:${values.DAMAT_RUNTIME_PASSWORD}@db:5432/damatjs`,
  MIGRATION_DATABASE_URL: `postgresql://damat_migrator:${values.DAMAT_MIGRATOR_PASSWORD}@db:5432/damatjs`,
  DAMAT_ALLOW_INSECURE_INTERNAL_NETWORK: "true",
  DAMAT_ALLOW_UNPINNED_IMAGES: "true",
});
const output = `${Object.entries(values)
  .map(([name, value]) => `${name}=${value}`)
  .join("\n")}\n`;
const path = process.env.COMPOSE_ENV_FILE
  ? resolve(process.env.COMPOSE_ENV_FILE)
  : join(import.meta.dir, "../.env.production.local");
writeFileSync(path, output, { encoding: "utf8", flag: "wx", mode: 0o600 });
console.log(
  `Created ${path}. It is gitignored; inject managed secrets in production.`,
);
