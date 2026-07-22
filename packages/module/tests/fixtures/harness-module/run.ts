import { join } from "node:path";
import { PoolManager } from "@damatjs/services";
import { bootModule } from "../../../src";

const databaseUrl = process.env.DATABASE_URL!;
const valid = import.meta.dir;
const invalid = join(import.meta.dir, "../harness-invalid");
const module = { name: "harness-fixture", service: {}, init: () => {} };
let tables: Record<string, string> | undefined;

for (let run = 0; run < 2; run += 1) {
  const booted = await bootModule(module, { databaseUrl, moduleDir: valid });
  const result = await booted.pool.query(
    `SELECT to_regclass('harness_fixture_records') AS domain,
            to_regclass('_damat_event_outbox') AS events`,
  );
  tables = result.rows[0];
  await booted.teardown();
}

let rejected = false;
try {
  await bootModule(module, { databaseUrl, moduleDir: invalid });
} catch {
  rejected = true;
}
console.log(
  `HARNESS_RESULT=${JSON.stringify({
    tables,
    rejected,
    poolReleased: !PoolManager.isInitialized(),
  })}`,
);
