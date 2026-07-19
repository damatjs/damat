import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "../..", "../..");
const compose = readFileSync(
  join(root, "backend/default/docker-compose.yml"),
  "utf8",
);
const roles = readFileSync(
  join(root, "backend/default/postgres/init-roles.sh"),
  "utf8",
);
const redis = readFileSync(
  join(root, "backend/default/redis/entrypoint.sh"),
  "utf8",
);

function service(name: string): string {
  const marker = `  ${name}:\n`;
  const start = compose.indexOf(`\n${marker}`);
  expect(start).toBeGreaterThan(-1);
  const tail = compose.slice(start + marker.length + 1);
  const end = tail.search(/\n  [a-z][\w-]*:\n/);
  return end === -1 ? tail : tail.slice(0, end);
}

test("hardens application containers and binds HTTP locally", () => {
  for (const setting of [
    "read_only: true",
    'cap_drop: ["ALL"]',
    'security_opt: ["no-new-privileges:true"]',
    "stop_grace_period: 40s",
  ])
    expect(compose).toContain(setting);
  expect(service("api")).toContain("127.0.0.1}:9000:9000");
  expect(compose).toContain("${METRICS_TOKEN:?set METRICS_TOKEN}");
  expect(compose).toContain("${BETTER_AUTH_SECRET:?set BETTER_AUTH_SECRET}");
  expect(compose).toContain("REQUIRED_SECRET_NAMES: BETTER_AUTH_SECRET");
});

test("separates bootstrap, migration, runtime, and backup database roles", () => {
  for (const name of ["damat_migrator", "damat_runtime", "damat_backup"])
    expect(roles).toContain(`CREATE ROLE ${name}`);
  expect(roles).toContain("NOSUPERUSER NOCREATEDB NOCREATEROLE");
  expect(roles).toContain("REVOKE CREATE ON SCHEMA public FROM PUBLIC");
  expect(compose).not.toContain("postgresql://postgres:");
  expect(service("db")).not.toContain("ports:");
});

test("restricts Redis commands and requires authenticated channel access", () => {
  expect(redis).toContain("user default off");
  expect(redis).toContain("-@admin -@dangerous");
  expect(redis).not.toContain("nopass");
  expect(service("redis")).toContain("REDIS_PASSWORD");
  expect(service("redis")).toContain("user: redis");
  expect(service("redis")).toContain(
    '["/bin/sh", "/etc/redis/damat-entrypoint.sh"]',
  );
});

test("provides real backup and disposable restore-drill roles", () => {
  expect(service("backup")).toContain("pg_dump");
  expect(service("backup")).toContain("damat_backup");
  expect(service("restore-db")).toContain("tmpfs:");
  expect(service("restore-drill")).toContain("--exit-on-error");
  expect(service("restore-drill")).toContain("--no-owner --no-acl");
  expect(service("restore-drill")).toContain("latest.dump");
});
