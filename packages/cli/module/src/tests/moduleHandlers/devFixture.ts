export const devFixture = {
  verification: { allowed: true, status: "verified", message: "" } as {
    allowed: boolean;
    status: string;
    message?: string;
  },
  runtimePlan: {
    packageDir: "/m",
    moduleDir: "/m",
    manifest: { name: "demo" },
    moduleConfig: {},
    capabilities: {
      models: false,
      migrations: false,
      jobs: false,
      events: false,
      pipelines: false,
      durable: false,
      requiresDatabase: false,
      workers: [],
    },
    config: {
      projectConfig: {
        databaseUrl: undefined as string | undefined,
        http: { host: "0.0.0.0", port: 7654 },
      },
    },
    routeBasePath: "/api",
  },
  portError: null as Error | null,
  databaseError: null as Error | null,
  calls: [] as string[],
};

export function resetDevFixture(value: typeof devFixture): void {
  value.verification = { allowed: true, status: "verified", message: "" };
  value.runtimePlan.capabilities.requiresDatabase = false;
  value.runtimePlan.config.projectConfig.databaseUrl = undefined;
  value.portError = null;
  value.databaseError = null;
  value.calls = [];
}
