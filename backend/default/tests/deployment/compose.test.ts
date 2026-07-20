import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "../..", "../..");
const compose = readFileSync(
  join(root, "backend/default/docker-compose.yml"),
  "utf8",
);
const drill = readFileSync(
  join(root, "backend/default/ops/staging-drill.sh"),
  "utf8",
);
const readiness = readFileSync(
  join(root, ".github/workflows/production-readiness.yml"),
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

test("builds one runtime image from the monorepo root", () => {
  expect(compose).toContain("${DAMAT_IMAGE:-damat-default:local}");
  expect(compose).toContain("context: ../..");
  expect(compose).toContain("dockerfile: backend/default/Dockerfile");
  for (const name of ["migrate", "api", "jobs", "events", "pipelines"]) {
    expect(service(name)).toContain("<<: *app");
  }
});

test("gates every runtime on the one-shot migration", () => {
  const migration = service("migrate");
  expect(migration).toContain('command: ["bun", "run", "db:migrate"]');
  expect(migration).toContain('restart: "no"');
  expect(migration).toContain("condition: service_healthy");
  for (const name of ["api", "jobs", "events", "pipelines"]) {
    expect(service(name)).toContain(
      "condition: service_completed_successfully",
    );
  }
});

test("selects each runtime responsibility exactly", () => {
  expect(service("api")).toContain("DAMAT_RUNTIME_MODE: server");
  expect(service("api")).not.toContain("DAMAT_WORKER_TYPES");
  expect(service("jobs")).toContain("DAMAT_RUNTIME_MODE: worker");
  expect(service("jobs")).toContain("DAMAT_WORKER_TYPES: jobs");
  expect(service("events")).toContain("DAMAT_RUNTIME_MODE: worker");
  expect(service("events")).toContain("DAMAT_WORKER_TYPES: events");
  expect(service("pipelines")).toContain("DAMAT_RUNTIME_MODE: worker");
  expect(service("pipelines")).toContain("DAMAT_WORKER_TYPES: pipelines");
});

test("only the API runtime owns an HTTP health check", () => {
  expect(service("api")).toContain("healthcheck:");
  for (const name of ["migrate", "jobs", "events", "pipelines"]) {
    expect(service(name)).not.toContain("healthcheck:");
  }
});

test("keeps Redis an optional wake-up accelerator", () => {
  expect(compose).toContain('REDIS_URL: "${REDIS_URL:-}"');
  expect(service("redis")).toContain("profiles: [accelerator]");
  expect(service("redis")).toContain("REDIS_PASSWORD");
  expect(drill).toContain("up -d db redis");
  expect(drill).toContain("wait_for_redis");
  expect(drill).toContain("up --build -d migrate api jobs events pipelines");
  const entrypoint = readFileSync(
    join(root, "backend/default/redis/entrypoint.sh"),
    "utf8",
  );
  expect(entrypoint).toContain("&damat:*");
  expect(entrypoint).toContain("&damat-events");
  expect(entrypoint).toContain("user default off");
});

test("executes durable work with Redis live and unavailable", () => {
  expect(service("worker-acceptance")).toContain(
    'command: ["bun", "ops/durable-work-acceptance.ts"]',
  );
  for (const source of [drill, readiness]) {
    expect(source).toContain("worker-acceptance");
    expect(source).toContain("postgres-fallback");
    expect(source).toContain("stop redis");
    expect(source).toContain("start redis");
  }
});

test("requires a database password without publishing PostgreSQL", () => {
  expect(compose).toContain("${POSTGRES_PASSWORD:?set POSTGRES_PASSWORD}");
  expect(service("db")).not.toContain("ports:");
  expect(service("db")).not.toContain("POSTGRES_PASSWORD: postgres");
});
