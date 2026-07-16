import { readFileSync } from "node:fs";
import { join } from "node:path";

const names = [
  "enums.ts",
  "users.ts",
  "users.zod.ts",
  "posts.ts",
  "posts.zod.ts",
  "index.ts",
];

export const expectedFiles = new Map(
  names.map((name, index) => {
    const prefix = String(index).padStart(2, "0");
    const path = join(import.meta.dir, "golden", `${prefix}-${name}.txt`);
    return [name, `${readFileSync(path, "utf8").trimEnd()}\n`];
  }),
);
