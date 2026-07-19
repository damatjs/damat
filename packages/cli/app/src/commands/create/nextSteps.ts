export function createNextSteps(
  directory: string,
  installed: boolean,
  databaseReady: boolean,
): string {
  return [
    "Next steps:",
    `  cd ${directory}`,
    ...(installed ? [] : ["  bun install"]),
    ...(databaseReady
      ? []
      : [
          "  bun run db:setup                # create DB + apply system migrations",
        ]),
    "  # .env contains the selected DATABASE_URL and generated secrets",
    "  bun run dev                      # http://localhost:6543/api/hello",
    "  bunx @damatjs/damat-cli@latest module add <source>",
  ].join("\n");
}
