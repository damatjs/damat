import { makeAdapter } from "./shared";

export const pnpmAdapter = (projectDir: string) =>
  makeAdapter(
    {
      name: "pnpm",
      command: "pnpm",
      add: "add",
      remove: "remove",
      lockfile: "pnpm-lock.yaml",
    },
    projectDir,
  );
