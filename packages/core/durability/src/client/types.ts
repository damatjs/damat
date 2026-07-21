import type { QueryResultRow } from "@damatjs/deps/pg";

export interface DurabilityExecutor {
  query<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    params?: unknown[],
  ): Promise<{ rows: T[]; rowCount: number | null }>;
}

export interface DurabilityPoolClient extends DurabilityExecutor {
  release(): void;
}

export interface DurabilityPool extends DurabilityExecutor {
  connect(): Promise<DurabilityPoolClient>;
}

export interface DurabilityClient extends DurabilityExecutor {
  readonly pool: DurabilityPool;
  transaction<T>(
    callback: (executor: DurabilityExecutor) => Promise<T>,
  ): Promise<T>;
}
