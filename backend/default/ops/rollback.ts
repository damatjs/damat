import { join } from "node:path";
import { rollbackImageAllowed } from "./rollback-policy";

const image = process.argv[2];
if (!image)
  throw new Error("usage: bun ops/rollback.ts <previous-image-digest>");
const allowMutable = process.env.DAMAT_ALLOW_MUTABLE_ROLLBACK === "true";
if (!rollbackImageAllowed(image, allowMutable))
  throw new Error("rollback image must be pinned to a sha256 digest");
const compose = join(import.meta.dir, "../docker-compose.yml");
const project = process.env.COMPOSE_PROJECT_NAME ?? "default";
if (!allowMutable) {
  const pull = Bun.spawn(["docker", "pull", image], {
    stdout: "inherit",
    stderr: "inherit",
  });
  if ((await pull.exited) !== 0)
    throw new Error("failed to pull rollback image");
}
const command = [
  "docker",
  "compose",
  "-p",
  project,
  "-f",
  compose,
  "up",
  "-d",
  "--no-deps",
  "--force-recreate",
  "api",
  "jobs",
  "events",
  "pipelines",
];
const rollback = Bun.spawn(command, {
  env: { ...process.env, DAMAT_IMAGE: image },
  stdout: "inherit",
  stderr: "inherit",
});
if ((await rollback.exited) !== 0) throw new Error("runtime rollback failed");
console.log(
  `Runtime roles rolled back to ${image}; database migrations were retained.`,
);
