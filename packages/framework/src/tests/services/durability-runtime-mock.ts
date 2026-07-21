interface MockState {
  durabilityClients: unknown[];
  readiness: unknown[];
  readinessError?: Error;
}

type ErrorConstructor = new (...args: never[]) => Error;

class FakeProcessDurabilityCoordinator {
  mode: "healthy" | "degraded" | "disabled";
  private readonly healthyMs: number;
  private readonly degradedMs: number;

  constructor(options: Record<string, number | string> = {}) {
    this.mode = (options.mode as typeof this.mode) ?? "disabled";
    this.healthyMs = (options.healthySafetyPollIntervalMs as number) ?? 30_000;
    this.degradedMs = (options.degradedMaxPollIntervalMs as number) ?? 5_000;
  }

  setMode(mode: typeof this.mode): void {
    this.mode = mode;
  }

  pollInterval(fallbackMs: number): number {
    return this.mode === "healthy"
      ? this.healthyMs
      : Math.min(fallbackMs, this.degradedMs);
  }

  async run<T>(_key: string, operation: () => Promise<T>): Promise<T> {
    return operation();
  }
}

export function durabilityRuntimeMock(
  state: MockState,
  NotMigratedError: ErrorConstructor,
) {
  const query = async () => ({ rows: [], rowCount: 0 });
  return {
    DurableInfrastructureNotMigratedError: NotMigratedError,
    ProcessDurabilityCoordinator: FakeProcessDurabilityCoordinator,
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
