import { afterEach, beforeEach } from "bun:test";
import fs from "node:fs";
import path from "node:path";

const base = path.join(process.cwd(), ".test-migrate-temp");
let counter = 0;
export let root = base;
export let USER = "";
export let POST = "";

export function setupProject(): void {
  beforeEach(() => {
    root = path.join(base, `t${counter++}`);
    fs.mkdirSync(root, { recursive: true });
    USER = path.join(root, "modules", "user");
    POST = path.join(root, "modules", "post");
  });
  afterEach(() => {
    fs.rmSync(base, { recursive: true, force: true });
  });
}

export function writeConfig(options: {
  modules?: Record<string, string>;
  databaseUrl?: string | null;
  services?: string;
}) {
  const modules = Object.entries(options.modules ?? {})
    .map(([name, resolve]) => `${name}:{resolve:${JSON.stringify(resolve)}}`)
    .join(",");
  const database =
    options.databaseUrl === null
      ? ""
      : `databaseUrl:${JSON.stringify(options.databaseUrl ?? "postgres://db")}`;
  fs.writeFileSync(
    path.join(root, "damat.config.ts"),
    `export default {projectConfig:{${database}},modules:{${modules}},services:{${options.services ?? ""}}}`,
  );
}

export function writeThrowingConfig() {
  fs.writeFileSync(
    path.join(root, "damat.config.ts"),
    `export default {
      get projectConfig(){throw new Error("db getter boom")},
      modules:{user:{resolve:${JSON.stringify(USER)}}}
    }`,
  );
}
