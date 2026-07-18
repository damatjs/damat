import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "../..", "../..");
const compose = readFileSync(
  join(root, "backend/default/docker-compose.yml"),
  "utf8",
);

function service(name: string): string {
  const marker = `  ${name}:\n`;
  const start = compose.indexOf(marker);
  expect(start).toBeGreaterThan(-1);
  const tail = compose.slice(start + marker.length);
  const end = tail.search(/\n  [a-z][\w-]*:\n/);
  return end === -1 ? tail : tail.slice(0, end);
}

test("builds one runtime image from the monorepo root", () => {
  expect(compose).toContain("image: damat-default:local");
  expect(compose).toContain("context: ../..");
  expect(compose).toContain("dockerfile: backend/default/Dockerfile");
  for (const name of ["migrate", "api", "jobs", "events"]) {
    expect(service(name)).toContain("<<: *app");
  }
});

test("gates every runtime on the one-shot migration", () => {
  const migration = service("migrate");
  expect(migration).toContain('command: ["bun", "run", "db:migrate"]');
  expect(migration).toContain('restart: "no"');
  expect(migration).toContain("condition: service_healthy");
  for (const name of ["api", "jobs", "events"]) {
    expect(service(name)).toContain(
      "condition: service_completed_successfully",
    );
  }
});

test("selects API, jobs, and events runtime responsibilities exactly", () => {
  expect(service("api")).toContain("DAMAT_RUNTIME_MODE: server");
  expect(service("api")).not.toContain("DAMAT_WORKER_TYPES");
  expect(service("jobs")).toContain("DAMAT_RUNTIME_MODE: worker");
  expect(service("jobs")).toContain("DAMAT_WORKER_TYPES: jobs");
  expect(service("events")).toContain("DAMAT_RUNTIME_MODE: worker");
  expect(service("events")).toContain("DAMAT_WORKER_TYPES: events");
});

test("only the API runtime owns an HTTP health check", () => {
  expect(service("api")).toContain("healthcheck:");
  for (const name of ["migrate", "jobs", "events"]) {
    expect(service(name)).not.toContain("healthcheck:");
  }
});

test("keeps Redis an optional wake-up accelerator", () => {
  expect(compose).toContain('REDIS_URL: "${REDIS_URL:-}"');
  expect(service("redis")).toContain("profiles: [accelerator]");
  expect(service("redis")).toContain("/etc/redis/users.acl");
  const acl = readFileSync(
    join(root, "backend/default/redis/users.acl"), "utf8");
  expect(acl).toContain("&damat:*");
  expect(acl).toContain("&damat-events");
});

test("requires a database password without publishing PostgreSQL", () => {
  expect(compose).toContain("${POSTGRES_PASSWORD:?set POSTGRES_PASSWORD}");
  expect(service("db")).not.toContain("ports:");
  expect(service("db")).not.toContain("POSTGRES_PASSWORD: postgres");
});
