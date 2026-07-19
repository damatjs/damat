interface MockState {
  durabilityClients: unknown[];
  readiness: unknown[];
  readinessError?: Error;
}

type ErrorConstructor = new (...args: never[]) => Error;

export function durabilityRuntimeMock(
  state: MockState,
  NotMigratedError: ErrorConstructor,
) {
  const query = async () => ({ rows: [], rowCount: 0 });
  return {
    DurableInfrastructureNotMigratedError: NotMigratedError,
    ProcessDurabilityCoordinator: class {},
    createDurabilityClient: ({ pool }: { pool: unknown }) => ({ pool }),
    clearDurabilityClient: () => {},
    setDurabilityClient: (client: unknown) =>
      state.durabilityClients.push(client),
    getDurabilityClient: () => ({ query }),
    assertSystemMigrationsApplied: async (
      _client: unknown,
      migrations: unknown,
    ) => {
      state.readiness.push(migrations);
      if (state.readinessError) throw state.readinessError;
    },
    collectSystemMigrations: (catalogs: Array<{ migrations: unknown[] }>) =>
      catalogs.flatMap(({ migrations }) => migrations),
    durabilitySystemMigrations: { migrations: [{ id: "shared" }] },
    claimAccelerationSignals: async () => [],
    clearAccelerationController: () => {},
    configureAccelerationController: () => {},
    markAccelerationSignalPublished: async () => true,
    releaseAccelerationSignal: async () => {},
    updateAccelerationState: async () => {},
  };
}
