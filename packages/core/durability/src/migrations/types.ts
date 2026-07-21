export interface SystemMigration {
  owner: string;
  id: string;
  order: number;
  sql: string;
}

export interface SystemMigrationCatalog {
  owner: string;
  migrations: readonly SystemMigration[];
}
