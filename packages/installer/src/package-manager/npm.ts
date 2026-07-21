import { makeAdapter } from "./shared";

export const npmAdapter = (projectDir: string) =>
  makeAdapter(
    {
      name: "npm",
      command: "npm",
      add: "install",
      remove: "uninstall",
      lockfile: "package-lock.json",
    },
    projectDir,
  );
