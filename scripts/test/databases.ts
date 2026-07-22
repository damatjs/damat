export const testDatabases = {
  DAMAT_CLI_DATABASE_URL: "damat_cli",
  DAMAT_DURABILITY_DATABASE_URL: "damat_durability",
  DAMAT_JOBS_DATABASE_URL: "damat_jobs",
  DAMAT_EVENTS_DATABASE_URL: "damat_events",
  DAMAT_PIPELINES_DATABASE_URL: "damat_pipelines",
  DAMAT_LINK_DATABASE_URL: "damat_link",
  DAMAT_SERVICES_DATABASE_URL: "damat_services",
  DAMAT_ORM_PG_DATABASE_URL: "damat_orm_pg",
  DAMAT_RECOVERY_DATABASE_URL: "damat_recovery",
} as const;

export type TestDatabaseVariable = keyof typeof testDatabases;

export function buildDatabaseUrls(
  baseUrl: string,
): Record<TestDatabaseVariable, string> {
  return Object.fromEntries(
    Object.entries(testDatabases).map(([variable, database]) => {
      const url = new URL(baseUrl);
      url.pathname = `/${database}`;
      return [variable, url.toString()];
    }),
  ) as Record<TestDatabaseVariable, string>;
}
