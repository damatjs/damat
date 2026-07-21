import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(import.meta.dir, "../..", "../..");
const dockerfile = readFileSync(
  join(root, "backend/default/Dockerfile"),
  "utf8",
);
const dockerignore = readFileSync(join(root, ".dockerignore"), "utf8");

test("pins Bun and excludes generated build caches", () => {
  expect(dockerfile.match(/FROM oven\/bun:1\.3\.14-alpine/g)).toHaveLength(2);
  for (const path of ["**/.next", ".turbo", "**/tsconfig.tsbuildinfo"]) {
    expect(dockerignore).toContain(path);
  }
  expect(dockerignore).toContain("backend/default/logs");
  expect(dockerignore).not.toContain("**/logs");
});

test("builds the default backend from the Bun monorepo root", () => {
  expect(dockerfile).toContain("WORKDIR /workspace");
  expect(dockerfile).toContain("COPY . .");
  expect(dockerfile).toContain("bun install --frozen-lockfile");
  expect(dockerfile).toContain("id=damat-bun");
  expect(dockerfile).toContain("id=damat-turbo");
  expect(dockerfile).toContain(
    "bunx turbo run build --filter=@damatjs/default...",
  );
  expect(dockerfile).toContain("bun install --production --frozen-lockfile");
  expect(dockerfile).toContain("RUN rm -rf node_modules");
  expect(dockerfile).toContain("RUN rm -rf .turbo");
  expect(dockerfile).not.toContain("bun --cwd backend/default run build");
  expect(dockerfile.match(/\/usr\/local\/bin\/damat$/gm)).toHaveLength(2);
  expect(dockerfile.match(/\/usr\/local\/bin\/damat-orm$/gm)).toHaveLength(2);
});

test("runs the Damat production bundle without obsolete Prisma paths", () => {
  expect(dockerfile).toContain("WORKDIR /workspace/backend/default");
  expect(dockerfile).toContain('CMD ["bun", "run", "start"]');
  expect(dockerfile).not.toMatch(/prisma|db:generate|npm|bun\.lockb/i);
});

test("leaves HTTP health ownership to the API service", () => {
  expect(dockerfile).not.toContain("HEALTHCHECK");
});
