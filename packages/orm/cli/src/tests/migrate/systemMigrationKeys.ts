export function systemMigrationKeys(
  migrations: Array<{ owner: string; id: string }>,
): string[] {
  return migrations.map(({ owner, id }) => `${owner}:${id}`);
}
