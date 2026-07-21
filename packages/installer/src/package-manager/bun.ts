import { makeAdapter } from "./shared";

export const bunAdapter = (projectDir: string) =>
  makeAdapter(
    {
      name: "bun",
      command: "bun",
      add: "add",
      remove: "remove",
      lockfile: "bun.lock",
    },
    projectDir,
  );
