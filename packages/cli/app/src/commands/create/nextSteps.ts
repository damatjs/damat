export function createNextSteps(name: string, installed: boolean): string {
  return [
    "Next steps:",
    `  cd ${name}`,
    ...(installed ? [] : ["  bun install"]),
    "  # .env was written with generated secrets — point DATABASE_URL at your postgres",
    "  bun run dev                      # http://localhost:6543/api/hello",
    "  bunx damat module add <source>   # install modules (registry, path, or git)",
  ].join("\n");
}
