import { resolve } from "node:path";
import { findFrameworkTests } from "./test-files";

const root = resolve(import.meta.dir, "../..");
const child = Bun.spawn(
  [
    process.execPath,
    "test",
    "--only-failures",
    ...process.argv.slice(2),
    ...findFrameworkTests(root),
  ],
  {
    cwd: root,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  },
);

process.exit(await child.exited);
