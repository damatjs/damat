import type { DurabilityExecutor } from "../../src";
import { createRepositoryContext } from "../repositoryContext";

export const actor = {
  id: "operator-1",
  type: "user" as const,
  metadata: { team: "ops" },
};

export type ControlTestContext = Awaited<
  ReturnType<typeof createRepositoryContext>
>;

export function transaction<T>(
  context: ControlTestContext,
  run: (executor: DurabilityExecutor) => Promise<T>,
): Promise<T> {
  return context.durability.transaction(run);
}
