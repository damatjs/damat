import { afterAll, beforeAll, describe, test } from "bun:test";
import {
  closeRecovery,
  initializeRecovery,
  recoveryReady,
  type RedisMode,
  type WorkKind,
} from "./recovery/context";
import { runRecoveryScenario } from "./recovery/scenario";

describe.skipIf(!recoveryReady)("durable crash recovery", () => {
  beforeAll(initializeRecovery);
  afterAll(closeRecovery);

  for (const kind of ["job", "event"] as WorkKind[]) {
    for (const redis of ["live", "down"] as RedisMode[]) {
      test(
        `${kind} recovers after SIGKILL with Redis ${redis}`,
        () => runRecoveryScenario(kind, redis),
        10_000,
      );
    }
  }
});
